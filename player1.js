/* ======================================================
   FIREBASE (FIRESTORE)
====================================================== */
import { db, rtdb } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ======================================================
   FIREBASE (REALTIME DATABASE)
====================================================== */
import {
  ref,
  set,
  onValue,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ======================================================
   ELEMENTS
====================================================== */
const video = document.getElementById("player");
const titleEl = document.getElementById("matchTitle");
const loader = document.getElementById("pageLoader");
const shareBtn = document.getElementById("shareLinkBtn");
const liveCountEl = document.getElementById("liveUserCount");

/* ======================================================
   GET MATCH ID
====================================================== */
const matchId = new URLSearchParams(window.location.search).get("id");

if (!matchId) {
  titleEl.textContent = "Invalid match";
  loader.classList.add("hide");
  throw new Error("No match ID");
}

/* ======================================================
   LIVE USER COUNT (REALTIME) ✅
====================================================== */
const userId = crypto.randomUUID();

const userRef = ref(rtdb, `liveMatches/${matchId}/users/${userId}`);
const usersRef = ref(rtdb, `liveMatches/${matchId}/users`);

// Add user
set(userRef, true);

// Remove on disconnect
onDisconnect(userRef).remove();

// Listen for live count
onValue(usersRef, (snapshot) => {
  const count = snapshot.exists()
    ? Object.keys(snapshot.val()).length
    : 0;

  if (liveCountEl) {
    liveCountEl.textContent = count;
  }
});

/* ======================================================
   ORIENTATION CONTROL (FULLSCREEN ROTATE)
====================================================== */
function lockOrientationLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function unlockOrientation() {
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  }
}

/* ======================================================
   LOAD MATCH
====================================================== */
async function loadMatch() {
  try {
    const snap = await getDoc(doc(db, "matches", matchId));

    if (!snap.exists()) {
      titleEl.textContent = "Match not found";
      loader.classList.add("hide");
      return;
    }

    const data = snap.data();

    if (!data.streamUrl || !data.streamUrl.includes(".m3u8")) {
      titleEl.textContent = "Unsupported stream";
      loader.classList.add("hide");
      return;
    }

    titleEl.textContent = data.title || "🔴 Live Match";
    initPlayer(data.streamUrl.trim());

  } catch (err) {
    console.error(err);
    titleEl.textContent = "Failed to load stream";
    loader.classList.add("hide");
  }
}

/* ======================================================
   INIT PLYR + HLS (AUTOPLAY ENABLED)
====================================================== */
function initPlayer(source) {

  // Required for autoplay
  video.muted = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      liveSyncDuration: 3
    });

    hls.loadSource(source);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {

      const plyr = new Plyr(video, {
        autoplay: true,
        muted: true,
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "settings",
          "fullscreen"
        ]
      });

      // Auto rotate on fullscreen
      plyr.on("enterfullscreen", lockOrientationLandscape);
      plyr.on("exitfullscreen", unlockOrientation);

      video.play().catch(() => {});
      loader.classList.add("hide");
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      console.error("HLS ERROR:", data);
      titleEl.textContent = "Stream error";
      loader.classList.add("hide");
    });

  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari / iOS
    video.src = source;

    const plyr = new Plyr(video, {
      autoplay: true,
      muted: true
    });

    plyr.on("enterfullscreen", lockOrientationLandscape);
    plyr.on("exitfullscreen", unlockOrientation);

    video.play().catch(() => {});
    loader.classList.add("hide");

  } else {
    titleEl.textContent = "HLS not supported";
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
   PULL TO REFRESH (MOBILE)
====================================================== */
let startY = 0;
let pulling = false;

window.addEventListener("touchstart", (e) => {
  if (window.scrollY === 0) {
    startY = e.touches[0].clientY;
    pulling = true;
  }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!pulling) return;

  const diff = e.touches[0].clientY - startY;

  if (diff > 120) {
    pulling = false;
    loader.classList.remove("hide");
    setTimeout(() => location.reload(), 400);
  }
}, { passive: true });

window.addEventListener("touchend", () => {
  pulling = false;
});

/* ======================================================
   INIT
====================================================== */
loadMatch();