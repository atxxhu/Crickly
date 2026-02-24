/* ======================================================
   FIREBASE SDK IMPORTS
====================================================== */
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { getDatabase } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ======================================================
   FIREBASE CONFIGURATION
====================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyCAoO-u-yfd5eScfpq9wch9n6XDnxrIld4",
  authDomain: "crickly-live.firebaseapp.com",
  projectId: "crickly-live",

  /* 🔴 REQUIRED FOR REALTIME DATABASE */
  databaseURL: "https://crickly-live-default-rtdb.firebaseio.com",

  storageBucket: "crickly-live.appspot.com",
  messagingSenderId: "270073784633",
  appId: "1:270073784633:web:5035e4e68f16e6b55e20e8"
};

/* ======================================================
   INITIALIZE FIREBASE APP
====================================================== */
const app = initializeApp(firebaseConfig);

/* ======================================================
   EXPORT SERVICES
====================================================== */
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);