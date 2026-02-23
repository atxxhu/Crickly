/* ======================================================
   FIREBASE
====================================================== */
import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ======================================================
   ELEMENTS
====================================================== */
const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const errorBox = document.getElementById("loginError");
const loader = document.getElementById("pageLoader");

/* ======================================================
   AUTO REDIRECT IF LOGGED IN
====================================================== */
onAuthStateChanged(auth, user => {
  if (user) {
    location.href = "admin.html";
  }
});

/* ======================================================
   LOGIN
====================================================== */
loginBtn.onclick = async () => {
  errorBox.style.display = "none";
  loader.classList.remove("hide");

  try {
    await signInWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value.trim()
    );

    location.href = "admin.html";

  } catch (err) {
    console.error(err);
    errorBox.style.display = "block";
    loader.classList.add("hide");
  }
};