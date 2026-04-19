import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2tzepBryQVDPeuBnuD3wdIktNfnRWVpA",
  authDomain: "emocc-esp32.firebaseapp.com",
  databaseURL:
    "https://emocc-esp32-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "emocc-esp32",
  storageBucket: "emocc-esp32.firebasestorage.app",
  messagingSenderId: "544060550231",
  appId: "1:544060550231:web:121a51597a54fa21cbc712",
  measurementId: "G-YK663RQ9Y4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("🔥 Firebase file loaded");

window.firebaseDb = db;
window.firestoreDoc = doc;
window.firestoreOnSnapshot = onSnapshot;
window.firestoreGetDoc = getDoc;
window.firestoreUpdateDoc = updateDoc;

console.log("🔥 firestoreGetDoc set:", window.firestoreGetDoc);
console.log("🔥 firestoreUpdateDoc set:", window.firestoreUpdateDoc);

export { db };
