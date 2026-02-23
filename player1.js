/* ======================================================
   FIREBASE
====================================================== */
import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ======================================================
   ELEMENTS
====================================================== */
const video = document.getElementById("player");
const titleEl = document.getElementById("matchTitle");
const loader = document.getElementById("pageLoader");

/* SHARE BUTTON */
const shareBtn = document.getElementById("shareLinkBtn");

/* ======================================================
   GET MATCH ID
====================================================== */
const matchId = new URLSearchParams(location.search).get("id");

if (!matchId) {
  titleEl.textContent = "Invalid match";
  loader.classList.add("hide");
  throw new Error("No match ID");
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

    const streamUrl = data.streamUrl.trim();

    titleEl.textContent = data.title || "Live Match";
    initPlayer(streamUrl);

  } catch (err) {
    console.error(err);
    titleEl.textContent = "Failed to load stream";
    loader.classList.add("hide");
  }
}

/* ======================================================
   INIT PLYR + HLS
====================================================== */
function initPlayer(source) {

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true
    });

    hls.loadSource(source);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      new Plyr(video, {
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

      video.play().catch(() => {});
      loader.classList.add("hide");
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      console.error("HLS ERROR:", data);
      titleEl.textContent = "Stream error";
      loader.classList.add("hide");
    });

  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = source;
    new Plyr(video);
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
   PULL TO REFRESH (CRICKLY LOADER)
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

    /* SHOW CRICKLY LOADER */
    loader.classList.remove("hide");

    /* RELOAD */
    setTimeout(() => {
      location.reload();
    }, 500);
  }
}, { passive: true });

window.addEventListener("touchend", () => {
  pulling = false;
});

/* ======================================================
   INIT
====================================================== */
loadMatch();