/* ======================================================
   IMPORT FIREBASE
====================================================== */
import { db, auth } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ======================================================
   STATE (EDIT MODE)
====================================================== */
let editingId = null;
let editingType = null; // "m3u8" | "mpd"

/* ======================================================
   ELEMENTS
====================================================== */
const loader = document.getElementById("pageLoader");
const addM3u8Btn = document.getElementById("addM3u8Btn");
const addMpdBtn = document.getElementById("addMpdBtn");
const adminContainer = document.querySelector(".admin-container");

/* ======================================================
   LOADER
====================================================== */
function showLoader() {
  loader?.classList.remove("hide");
}
function hideLoader() {
  loader?.classList.add("hide");
}

/* ======================================================
   AUTH CHECK
====================================================== */
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
  } else {
    loadMatches();
    hideLoader();
  }
});

/* ======================================================
   LOGOUT
====================================================== */
document.getElementById("logoutBtn").onclick = async () => {
  showLoader();
  await signOut(auth);
  location.href = "login.html";
};

/* ======================================================
   LOAD MATCHES
====================================================== */
async function loadMatches() {
  document.getElementById("adminMatchList")?.remove();

  const list = document.createElement("div");
  list.id = "adminMatchList";
  adminContainer.appendChild(list);

  const q = query(
    collection(db, "matches"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    list.innerHTML =
      `<p style="text-align:center;opacity:.6">No matches posted</p>`;
    return;
  }

  snap.forEach(d => {
    const data = d.data();

    list.innerHTML += `
      <div class="admin-match-card">
        <div class="admin-match-poster">
          <img src="${data.posterUrl}" alt="">
        </div>

        <div class="admin-match-body">
          <h3>${data.title}</h3>

          <p class="admin-meta">
            ${new Date(data.createdAt).toLocaleString()}
          </p>

          <p class="admin-meta">
            Status:
            <span class="status-${data.status}">
              ${data.status}
            </span>
          </p>

          <p class="admin-meta">
            Player:
            <strong>${data.cookie ? "MPD" : "M3U8"}</strong>
          </p>

          <div class="admin-actions">
            <button class="btn edit-btn"
              onclick="editMatch('${d.id}')">
              Edit
            </button>

            <button class="btn delete-btn"
              onclick="deleteMatch('${d.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

/* ======================================================
   DELETE MATCH
====================================================== */
window.deleteMatch = async id => {
  if (!confirm("Delete this match?")) return;
  showLoader();
  await deleteDoc(doc(db, "matches", id));
  await loadMatches();
  hideLoader();
};

/* ======================================================
   EDIT MATCH (LOAD INTO FORM)
====================================================== */
window.editMatch = async id => {
  showLoader();

  const snap = await getDoc(doc(db, "matches", id));
  const d = snap.data();

  editingId = id;

  if (d.cookie) {
    // MPD
    editingType = "mpd";

    mpdTitle.value = d.title || "";
    mpdPoster.value = d.posterUrl || "";
    mpdUrl.value = d.streamUrl || "";
    mpdCookie.value = d.cookie || "";
    mpdKid.value = d.kid || "";
    mpdKey.value = d.key || "";
    mpdStatus.value = d.status || "live";

    addMpdBtn.textContent = "Update MPD Match";
    addMpdBtn.scrollIntoView({ behavior: "smooth" });

  } else {
    // M3U8
    editingType = "m3u8";

    m3u8Title.value = d.title || "";
    m3u8Poster.value = d.posterUrl || "";
    m3u8Url.value = d.streamUrl || "";
    m3u8Status.value = d.status || "live";

    addM3u8Btn.textContent = "Update M3U8 Match";
    addM3u8Btn.scrollIntoView({ behavior: "smooth" });
  }

  hideLoader();
};

/* ======================================================
   ADD / UPDATE M3U8
====================================================== */
addM3u8Btn.onclick = async () => {
  const data = {
    title: m3u8Title.value.trim(),
    posterUrl: m3u8Poster.value.trim(),
    streamUrl: m3u8Url.value.trim(),
    status: m3u8Status.value
  };

  if (!data.title || !data.posterUrl || !data.streamUrl) {
    alert("Fill all fields");
    return;
  }

  showLoader();

  if (editingId && editingType === "m3u8") {
    await updateDoc(doc(db, "matches", editingId), data);
  } else {
    await addDoc(collection(db, "matches"), {
      ...data,
      createdAt: Date.now()
    });
  }

  editingId = null;
  editingType = null;
  addM3u8Btn.textContent = "Add M3U8 Match";

  m3u8Title.value = "";
  m3u8Poster.value = "";
  m3u8Url.value = "";

  await loadMatches();
  hideLoader();
};

/* ======================================================
   ADD / UPDATE MPD
====================================================== */
addMpdBtn.onclick = async () => {
  const data = {
    title: mpdTitle.value.trim(),
    posterUrl: mpdPoster.value.trim(),
    streamUrl: mpdUrl.value.trim(),
    cookie: mpdCookie.value.trim(),
    kid: mpdKid.value.trim(),
    key: mpdKey.value.trim(),
    status: mpdStatus.value
  };

  if (!data.title || !data.posterUrl || !data.streamUrl) {
    alert("Fill all fields");
    return;
  }

  showLoader();

  if (editingId && editingType === "mpd") {
    await updateDoc(doc(db, "matches", editingId), data);
  } else {
    await addDoc(collection(db, "matches"), {
      ...data,
      createdAt: Date.now()
    });
  }

  editingId = null;
  editingType = null;
  addMpdBtn.textContent = "Add MPD Match";

  mpdTitle.value = "";
  mpdPoster.value = "";
  mpdUrl.value = "";
  mpdCookie.value = "";
  mpdKid.value = "";
  mpdKey.value = "";

  await loadMatches();
  hideLoader();
};