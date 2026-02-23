/* ======================================================
   IMPORT FIREBASE
====================================================== */
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ======================================================
   ELEMENTS
====================================================== */
const matchList = document.getElementById("matchList");
const loader = document.getElementById("pageLoader");

/* ======================================================
   FETCH MATCHES
====================================================== */
async function loadMatches() {
  try {
    matchList.innerHTML = "";
    loader?.classList.remove("hide");

    const q = query(
      collection(db, "matches"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      matchList.innerHTML = `
        <p style="text-align:center;opacity:.6;margin-top:40px">
          No matches available
        </p>
      `;
    } else {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const isLive = data.status === "live";

        matchList.innerHTML += `
          <div class="match-card ${isLive ? "" : "disabled"}"
               ${isLive ? `onclick="openPlayer('${docSnap.id}')"` : ""}>

            <span class="live-badge ${data.status}">
              ${isLive ? "LIVE" : "UPCOMING"}
            </span>

            <div class="match-poster">
              <img src="${data.posterUrl}" alt="poster">
            </div>

            <div class="match-info">
              <h2 class="match-title">${data.title}</h2>
              <p class="match-time">
                ${formatTime(data.createdAt)}
              </p>
            </div>
          </div>
        `;
      });
    }

  } catch (err) {
    console.error(err);
    matchList.innerHTML = `
      <p style="text-align:center;color:#f87171;margin-top:40px">
        Failed to load matches
      </p>
    `;
  } finally {
    loader?.classList.add("hide");
  }
}

/* ======================================================
   OPEN PLAYER (AUTO ROUTE)
====================================================== */
window.openPlayer = async function (id) {
  try {
    const snap = await getDoc(doc(db, "matches", id));
    if (!snap.exists()) return;

    const data = snap.data();

    if (data.streamUrl?.endsWith(".m3u8")) {
      location.href = `player1.html?id=${id}`;
      return;
    }

    if (data.streamUrl?.endsWith(".mpd")) {
      location.href = `player2.html?id=${id}`;
      return;
    }

    alert("Unsupported stream format");

  } catch (err) {
    console.error(err);
    alert("Unable to open player");
  }
};

/* ======================================================
   FORMAT TIME
====================================================== */
function formatTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString();
}

/* ======================================================
   PULL TO REFRESH (HOMEPAGE ONLY)
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
    loader?.classList.remove("hide");

    /* RE-FETCH MATCHES */
    setTimeout(async () => {
      await loadMatches();
      refreshing = false;
    }, 400);
  }
}, { passive: true });

window.addEventListener("touchend", () => {
  pulling = false;
});

/* ======================================================
   INIT
====================================================== */
loadMatches();