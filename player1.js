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

const userRef  = ref(
  rtdb,
  `liveMatches/${matchId}/users/${userId}`
);

const usersRef = ref(
  rtdb,
  `liveMatches/${matchId}/users`
);

set(userRef, true);

onDisconnect(userRef).remove();

window.addEventListener("beforeunload", () => {
  remove(userRef);
});

onValue(usersRef, (snap) => {

  liveCountEl.textContent = snap.exists()
    ? Object.keys(snap.val()).length
    : 0;

});


/* ======================================================
   ORIENTATION
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

    const snap = await getDoc(
      doc(db, "matches", matchId)
    );

    if (!snap.exists()) {

      titleEl.textContent = "Match not found";
      loader.classList.add("hide");
      return;

    }

    const data = snap.data();
    const url  = data.streamUrl;

    if (!url) {

      titleEl.textContent = "No stream available";
      loader.classList.add("hide");
      return;

    }

    titleEl.textContent =
      data.title || "🔴 Live Match";

    initPlayer(url.trim(), data);

  }
  catch (e) {

    console.error(e);

    titleEl.textContent = "Stream error";
    loader.classList.add("hide");

  }

}


/* ======================================================
   INIT PLAYER
====================================================== */
function initPlayer(url, data) {

  /* =========================================
     🔥 IFRAME SUPPORT (NEW ADDITION)
  ========================================= */
  if (
    url.includes("embed") ||
    url.includes("play?url=")
  ) {

    document.getElementById("player").innerHTML = `
      <iframe 
        src="${url}" 
        width="100%" 
        height="100%" 
        frameborder="0" 
        allowfullscreen
        allow="autoplay; fullscreen"
        style="border:0;">
      </iframe>
    `;

    loader.classList.add("hide");
    return;
  }


  /* =========================================
     JWPLAYER (ORIGINAL CODE)
  ========================================= */
  const config = {

    file: url,
    autostart: true,
    mute: true,
    width: "100%",
    aspectratio: "16:9",
    stretching: "uniform"

  };


  /* =========================
     HLS STREAM
  ========================= */
  if (url.includes(".m3u8")) {
    config.type = "hls";
  }


  /* =========================
     DASH CLEARKEY
  ========================= */
  if (url.includes(".mpd") && data.kid && data.key) {

    config.type = "dash";

    config.drm = {
      clearkey: {
        keyId: data.kid,
        key: data.key
      }
    };

  }


  jwplayer("player").setup(config);

  const playerInstance = jwplayer("player");


  playerInstance.on("fullscreen", (e) => {

    if (e.fullscreen) {
      lockOrientationLandscape();
    } else {
      unlockOrientation();
    }

  });


  playerInstance.on("ready", () => {
    loader.classList.add("hide");
  });


  playerInstance.on("error", (e) => {
    console.warn("JW Error:", e);
    titleEl.textContent = "Playback error";
  });

}


/* ======================================================
   SHARE
====================================================== */
shareBtn.addEventListener("click", async () => {

  const url = window.location.href;

  if (navigator.share) {

    navigator.share({
      title: titleEl.textContent,
      url
    });

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