/* ======================================
   FIREBASE IMPORTS
====================================== */

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


/* ======================================
   HTML ELEMENTS
====================================== */

const video     = document.getElementById("video");
const loading   = document.getElementById("pageLoader");
const titleEl   = document.getElementById("matchTitle");
const liveCount = document.getElementById("liveUserCount");


/* ======================================
   MATCH ID FROM URL
====================================== */

const matchId = new URLSearchParams(location.search).get("id");

if (!matchId) {

  if (titleEl) titleEl.textContent = "Invalid match";

  throw new Error("No match ID");

}


/* ======================================
   REALTIME USER COUNT
====================================== */

const userId = crypto.randomUUID();

const userRef  = ref(rtdb, `liveMatches/${matchId}/users/${userId}`);
const usersRef = ref(rtdb, `liveMatches/${matchId}/users`);

set(userRef, true);
onDisconnect(userRef).remove();

onValue(usersRef, (snap) => {

  if (!liveCount) return;

  liveCount.textContent = snap.exists()
    ? Object.keys(snap.val()).length
    : 0;

});


/* ======================================
   SHAKA PLAYER INIT
====================================== */

shaka.polyfill.installAll();

if (!shaka.Player.isBrowserSupported()) {

  if (titleEl) titleEl.textContent = "Browser not supported";

  throw new Error("Browser not supported");

}


/* ======================================
   PLAYER INITIALIZATION
====================================== */

async function initPlayer(streamUrl, data) {

  const player = new shaka.Player(video);

  const container = document.querySelector(".shaka-video-container");

  const ui = new shaka.ui.Overlay(player, container, video);


  /* ---------- PLAYER CONTROLS ---------- */

  ui.configure({

    controlPanelElements: [

      'play_pause',
      'mute',
      'time_and_duration',
      'spacer',
      'quality',
      'language',
      'picture_in_picture',
      'fullscreen',
      'overflow_menu'

    ],

    addSeekBar: true

  });


  /* ---------- STREAM SETTINGS ---------- */

  player.configure({

    streaming: {
      bufferingGoal: 15,
      rebufferingGoal: 3,
      bufferBehind: 30
    }

  });


  /* ======================================
     NETWORK HEADERS
  ====================================== */

  player.getNetworkingEngine().registerRequestFilter((type, request) => {

    let url = request.uris[0];


    /* ---------- FAN CODE HEADERS ---------- */

    if (url.includes("fancode")) {

      request.headers["Referer"] = "https://www.fancode.com/";
      request.headers["Origin"]  = "https://www.fancode.com";

      request.headers["User-Agent"] =
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

    }


    /* ---------- COOKIE SUPPORT ---------- */

    if (data?.cookie) {

      request.headers["Cookie"] = data.cookie;

      if (

        (type === shaka.net.NetworkingEngine.RequestType.MANIFEST ||
         type === shaka.net.NetworkingEngine.RequestType.SEGMENT)

        && !url.includes("__hdnea=")

      ) {

        const sep = url.includes("?") ? "&" : "?";

        request.uris[0] = url + sep + data.cookie;

      }

    }

  });


  /* ======================================
     LOAD STREAM
  ====================================== */

  try {

    await player.load(streamUrl);

    await video.play().catch(() => {

      video.muted = true;
      video.play();

    });


    video.addEventListener("playing", () => {

      if (loading) loading.style.display = "none";

    });

  }


  /* ======================================
     FALLBACK PLAYER
  ====================================== */

  catch (e) {

    console.error("Shaka error:", e);

    video.src  = streamUrl;
    video.type = "application/x-mpegURL";

    video.play();

    video.addEventListener("playing", () => {

      if (loading) loading.style.display = "none";

    });

  }

}


/* ======================================
   LOAD MATCH DATA
====================================== */

async function loadMatch() {

  try {

    const snap = await getDoc(doc(db, "matches", matchId));

    if (!snap.exists()) {

      if (titleEl) titleEl.textContent = "Match not found";

      return;

    }

    const data = snap.data();


    /* ---------- SET TITLE ---------- */

    if (titleEl) {

      titleEl.textContent = data.title || "🔴 Live Match";

    }


    /* ---------- STREAM CHECK ---------- */

    if (!data.streamUrl) {

      if (titleEl) titleEl.textContent = "Stream missing";

      return;

    }


    /* ---------- INIT PLAYER ---------- */

    await initPlayer(data.streamUrl, data);

  }

  catch (e) {

    console.error(e);

    if (titleEl) titleEl.textContent = "Stream error";

  }

}


/* ======================================
   START PLAYER
====================================== */

loadMatch();


/* ======================================
   TELEGRAM POPUP
====================================== */

const modal = document.getElementById("telegramModal");

if (modal) {

  setTimeout(() => {

    modal.classList.remove("hidden");

  }, 2000);

}


/* ---------- JOIN BUTTON ---------- */

const joinBtn = document.getElementById("joinButton");

if (joinBtn) {

  joinBtn.onclick = () => {

    window.open(
      "https://telegram.me/+NSqV0ZHy3flhZmQ1",
      "_blank"
    );

    modal.classList.add("hidden");

  };

}


/* ---------- CLOSE BUTTON ---------- */

const closeBtn = document.getElementById("closeButton");

if (closeBtn) {

  closeBtn.onclick = () => {

    modal.classList.add("hidden");

  };

}


/* ======================================================
   SHARE BUTTON
====================================================== */

const shareBtn = document.getElementById("shareLinkBtn");

if (shareBtn) {

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

}