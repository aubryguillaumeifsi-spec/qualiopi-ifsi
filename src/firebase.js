import { initializeApp } from "firebase/app";
import { getFirestore, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // <-- AJOUT POUR LE STOCKAGE

const firebaseConfig = {
  apiKey: "AIzaSyDY6ZTEOi-g0_98QHHzSJFNgPC0DMTdaus",
  authDomain: "qualiopi-cham.firebaseapp.com",
  projectId: "qualiopi-cham",
  storageBucket: "qualiopi-cham.firebasestorage.app",
  messagingSenderId: "350382146811",
  appId: "1:350382146811:web:4962b341a25cd20ebb5c5e"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // <-- AJOUT POUR LE STOCKAGE
export const DOC_REF = doc(db, "qualiopi", "criteres");
