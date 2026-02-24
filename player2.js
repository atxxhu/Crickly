/* ======================================================
   FIREBASE
====================================================== */
import { db, rtdb } from "./firebase.js";
import { doc, getDoc }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

/* 🔒 LOCK ELEMENTS */
const playerCard = document.querySelector(".player-card");
const lockBtn = document.getElementById("playerLockBtn");

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
   LIVE USER COUNT (REALTIME)
====================================================== */
const userId = crypto.randomUUID();
const userRef = ref(rtdb, `liveMatches/${matchId}/users/${userId}`);
const usersRef = ref(rtdb, `liveMatches/${matchId}/users`);

set(userRef, true);
onDisconnect(userRef).remove();

onValue(usersRef, snap => {
  liveCountEl.textContent = snap.exists()
    ? Object.keys(snap.val()).length
    : 0;
});

/* ======================================================
   PLAYER LOCK (SHAKA SAFE & STABLE)
====================================================== */
let isLocked = false;

lockBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent Shaka click capture
  isLocked = !isLocked;

  if (isLocked) {
    playerCard.classList.add("locked");
    lockBtn.textContent = "🔓 Unlock";
  } else {
    playerCard.classList.remove("locked");
    lockBtn.textContent = "🔒 Lock";
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
        drm: { clearKeys: { [data.kid]: data.key } }
      });
    }

    /* HEADERS */
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
   SHARE
====================================================== */
shareBtn.addEventListener("click", async () => {
  const url = location.href;

  if (navigator.share) {
    navigator.share({ title: titleEl.textContent, url });
  } else {
    await navigator.clipboard.writeText(url);
    shareBtn.textContent = "Copied!";
    setTimeout(() => shareBtn.textContent = "🔗 Share", 1500);
  }
});

/* ======================================================
   START
====================================================== */
loadMatch();