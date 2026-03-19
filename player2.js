/* ======================================================
   FIREBASE IMPORTS
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
   DOM
====================================================== */
const loader      = document.getElementById("pageLoader");
const titleEl     = document.getElementById("matchTitle");
const video       = document.getElementById("video");
const container   = document.querySelector(".shaka-video-container");
const shareBtn    = document.getElementById("shareLinkBtn");
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
   LIVE USER COUNT
====================================================== */
const userId   = crypto.randomUUID();
const userRef  = ref(rtdb, `liveMatches/${matchId}/users/${userId}`);
const usersRef = ref(rtdb, `liveMatches/${matchId}/users`);

set(userRef, true);
onDisconnect(userRef).remove();

onValue(usersRef, (snap) => {
  liveCountEl.textContent = snap.exists()
    ? Object.keys(snap.val()).length
    : 0;
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
const ui     = new shaka.ui.Overlay(player, container, video);

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
  ]
});


/* ======================================================
   ERROR HANDLER
====================================================== */
player.addEventListener("error", e => {
  console.error("Shaka Error:", e.detail);
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

    if (!data.streamUrl) {
      titleEl.textContent = "No stream found";
      return;
    }

    titleEl.textContent = data.title || "🔴 Live Match";


    /* =========================
       SAFE URL DETECTION
    ========================= */
    const url = (data.streamUrl || "").toLowerCase();

    const isMPD  = url.includes(".mpd");
    const isM3U8 = url.includes(".m3u8");

    console.log("Stream:", isMPD ? "MPD" : isM3U8 ? "M3U8" : "UNKNOWN");


    /* =========================
       RESET PLAYER
    ========================= */
    player.configure({ drm: {} });
    player.getNetworkingEngine().clearAllRequestFilters();


    /* =========================
       DRM (CLEARKEY)
    ========================= */
    if (data.kid && data.key) {

      console.log("Applying DRM");

      player.configure({
        drm: {
          clearKeys: {
            [data.kid]: data.key
          }
        }
      });

    }


    /* =========================
       HEADERS
    ========================= */
    player.getNetworkingEngine().registerRequestFilter((type, request) => {

      request.headers["Referer"] =
        data.referer || "https://www.jiotv.com/";

      request.headers["User-Agent"] =
        data.userAgent || "plaYtv/7.1.5 (Linux;Android 13) ExoPlayerLib/2.11.6";


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


    /* =========================
       LOAD STREAM
    ========================= */
    await player.load(data.streamUrl);

    console.log("Video Loaded");


    /* =========================
       AUTOPLAY SAFE
    ========================= */
    try {
      await video.play();
    } catch {
      console.log("Autoplay blocked");
    }

  }
  catch (e) {

    console.error("Playback Error:", e);
    titleEl.textContent = "Stream error";

  }
  finally {

    loader.classList.add("hide");

  }

}


/* ======================================================
   SHARE BUTTON
====================================================== */
shareBtn.addEventListener("click", async () => {

  const url = location.href;

  if (navigator.share) {

    navigator.share({
      title: titleEl.textContent,
      url
    });

  }
  else {

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