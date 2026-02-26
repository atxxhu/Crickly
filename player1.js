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
  onDisconnect,
  remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ======================================================
   ELEMENTS
====================================================== */
const video       = document.getElementById("player");
const titleEl     = document.getElementById("matchTitle");
const loader      = document.getElementById("pageLoader");
const shareBtn    = document.getElementById("shareLinkBtn");
const liveCountEl = document.getElementById("liveUserCount");

/* ======================================================
   MATCH ID
====================================================== */
const matchId = new URLSearchParams(window.location.search).get("id");

if (!matchId) {
  titleEl.textContent = "Invalid match";
  loader.classList.add("hide");
  throw new Error("No match ID");
}

/* ======================================================
   LIVE USERS (REALTIME)
====================================================== */
const userId   = crypto.randomUUID();
const userRef  = ref(rtdb, `liveMatches/${matchId}/users/${userId}`);
const usersRef = ref(rtdb, `liveMatches/${matchId}/users`);

set(userRef, true);
onDisconnect(userRef).remove();
window.addEventListener("beforeunload", () => remove(userRef));

onValue(usersRef, snap => {
  liveCountEl.textContent = snap.exists()
    ? Object.keys(snap.val()).length
    : 0;
});

/* ======================================================
   ORIENTATION (AUTO ROTATE)
====================================================== */
function lockOrientationLandscape() {
  if (screen.orientation?.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function unlockOrientation() {
  if (screen.orientation?.unlock) {
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
      return;
    }

    const data = snap.data();

    if (!data.streamUrl || !data.streamUrl.includes(".m3u8")) {
      titleEl.textContent = "Unsupported stream";
      return;
    }

    titleEl.textContent = data.title || "🔴 Live Match";
    initPlayer(data.streamUrl.trim());

  } catch (e) {
    console.error(e);
    titleEl.textContent = "Stream error";
  }
}

/* ======================================================
   INIT PLAYER (LOW LATENCY)
====================================================== */
let hls;
let plyr;

function initPlayer(source) {

  video.muted = true;
  video.setAttribute("playsinline", "");

  if (hls)  hls.destroy();
  if (plyr) plyr.destroy();

  if (Hls.isSupported()) {

    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true
    });

    hls.loadSource(source);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {

      plyr = new Plyr(video, {
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

      plyr.on("enterfullscreen", lockOrientationLandscape);
      plyr.on("exitfullscreen", unlockOrientation);

      video.play().catch(() => {});
      loader.classList.add("hide");
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      console.warn("HLS:", data.details);
    });

  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {

    video.src = source;

    plyr = new Plyr(video, {
      autoplay: true,
      muted: true
    });

    plyr.on("enterfullscreen", lockOrientationLandscape);
    plyr.on("exitfullscreen", unlockOrientation);

    video.play().catch(() => {});
    loader.classList.add("hide");

  } else {
    titleEl.textContent = "HLS not supported";
  }
}

/* ======================================================
   SHARE
====================================================== */
shareBtn.addEventListener("click", async () => {
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({ title: titleEl.textContent, url });
  } else {
    await navigator.clipboard.writeText(url);
    shareBtn.textContent = "Copied!";
    setTimeout(() => {
      shareBtn.textContent = "🔗 Share";
    }, 1500);
  }
});

/* ======================================================
   START
====================================================== */
loadMatch();