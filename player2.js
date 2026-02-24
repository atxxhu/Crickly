/* ======================================================
   FIREBASE
====================================================== */
import { db, rtdb } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  set,
  onValue,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ======================================================
   ELEMENTS
====================================================== */
const loader = document.getElementById("pageLoader");
const titleEl = document.getElementById("matchTitle");
const video = document.getElementById("video");
const container = document.querySelector(".shaka-video-container");
const shareBtn = document.getElementById("shareLinkBtn");
const liveCountEl = document.getElementById("liveUserCount");

/* ======================================================
   MATCH ID
====================================================== */
const matchId = new URLSearchParams(location.search).get("id");
if (!matchId) {
  titleEl.textContent = "Invalid match";
  loader.classList.add("hide");
  throw new Error("No match ID");
}

/* ======================================================
   LIVE USER COUNT (REALTIME) 🔴
====================================================== */
const userId = crypto.randomUUID();

const userRef = ref(rtdb, `liveMatches/${matchId}/users/${userId}`);
const usersRef = ref(rtdb, `liveMatches/${matchId}/users`);

// Add user
set(userRef, true);

// Remove on disconnect
onDisconnect(userRef).remove();

// Listen for count
onValue(usersRef, (snapshot) => {
  const count = snapshot.exists()
    ? Object.keys(snapshot.val()).length
    : 0;

  if (liveCountEl) {
    liveCountEl.textContent = count;
  }
});

/* ======================================================
   SHAKA INIT
====================================================== */
shaka.polyfill.installAll();

if (!shaka.Player.isBrowserSupported()) {
  titleEl.textContent = "Browser not supported";
  loader.classList.add("hide");
  throw new Error("Shaka not supported");
}

const player = new shaka.Player(video);
const ui = new shaka.ui.Overlay(player, container, video);

ui.configure({
  controlPanelElements: [
    "play_pause",
    "time_and_duration",
    "mute",
    "volume",
    "spacer",
    "quality",
    "picture_in_picture",
    "fullscreen"
  ],
  seekBarColors: {
    base: "rgba(255,255,255,0.35)",
    buffered: "rgba(255,255,255,0.6)",
    played: "#22c55e"
  }
});

/* ======================================================
   LOAD MATCH
====================================================== */
async function loadMatch() {
  try {
    const snap = await getDoc(doc(db, "matches", matchId));
    if (!snap.exists()) {
      titleEl.textContent = "Match not found";
      return;
    }

    const data = snap.data();

    if (!data.streamUrl || !data.streamUrl.endsWith(".mpd")) {
      titleEl.textContent = "Unsupported stream";
      return;
    }

    titleEl.textContent = data.title || "🔴 Live Match";

    /* DRM (ClearKey) */
    if (data.kid && data.key) {
      player.configure({
        drm: {
          clearKeys: {
            [data.kid]: data.key
          }
        }
      });
    }

    /* HEADERS / TOKENS */
    player.getNetworkingEngine().registerRequestFilter((type, request) => {
      request.headers["Referer"] = "https://www.jiotv.com/";
      request.headers["User-Agent"] =
        "plaYtv/7.1.5 (Linux;Android 13) ExoPlayerLib/2.11.6";

      if (data.cookie) {
        request.headers["Cookie"] = data.cookie;

        if (
          (type === shaka.net.NetworkingEngine.RequestType.MANIFEST ||
           type === shaka.net.NetworkingEngine.RequestType.SEGMENT) &&
          !request.uris[0].includes("__hdnea=")
        ) {
          const sep = request.uris[0].includes("?") ? "&" : "?";
          request.uris[0] += sep + data.cookie;
        }
      }
    });

    await player.load(data.streamUrl);
    await video.play().catch(() => {});
  }
  catch (e) {
    console.error(e);
    titleEl.textContent = "Stream error";
  }
  finally {
    loader.classList.add("hide");
  }
}

/* ======================================================
   SHARE LINK BUTTON
====================================================== */
shareBtn?.addEventListener("click", async () => {
  const url = window.location.href;

  try {
    if (navigator.share) {
      await navigator.share({
        title: titleEl.textContent || "Live Match",
        url
      });
    } else {
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = "Link Copied!";
      setTimeout(() => {
        shareBtn.textContent = "🔗 Share Link";
      }, 1500);
    }
  } catch (err) {
    console.error("Share failed:", err);
  }
});

/* ======================================================
   PULL TO REFRESH
====================================================== */
let startY = 0;
let pulling = false;
let refreshing = false;

window.addEventListener("touchstart", (e) => {
  if (window.scrollY === 0 && !refreshing) {
    startY = e.touches[0].clientY;
    pulling = true;
  }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!pulling || refreshing) return;

  const diff = e.touches[0].clientY - startY;

  if (diff > 120) {
    pulling = false;
    refreshing = true;
    loader.classList.remove("hide");
    setTimeout(() => location.reload(), 500);
  }
}, { passive: true });

window.addEventListener("touchend", () => {
  pulling = false;
});

/* ======================================================
   START
====================================================== */
loadMatch();