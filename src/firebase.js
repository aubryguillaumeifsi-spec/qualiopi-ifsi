import { initializeApp } from "firebase/app";
import { getFirestore, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA_k-WmHFJD7vz3ZGmf-Uin3rue4T-CE6s",
  authDomain: "qualiopi-tracker-v2.firebaseapp.com",
  projectId: "qualiopi-tracker-v2",
  storageBucket: "qualiopi-tracker-v2.firebasestorage.app",
  messagingSenderId: "561921109114",
  appId: "1:561921109114:web:0e1e0296b5b918a0ea1fc3"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); 
export const DOC_REF = doc(db, "qualiopi", "criteres");
