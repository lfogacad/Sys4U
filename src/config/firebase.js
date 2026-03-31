import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAl4mPSN5cFyoIloswM8Qv64jVo_VIzS_g",
  authDomain: "fasthug-c0c7e.firebaseapp.com",
  projectId: "fasthug-c0c7e",
  storageBucket: "fasthug-c0c7e.firebasestorage.app",
  messagingSenderId: "38672574925",
  appId: "1:38672574925:web:22dd6a9a88a0cbc8d5fc84",
  measurementId: "G-0BM706SM0H",
};

let app, auth, db;
let firebaseError = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Falha ao inicializar Firebase:", error);
  firebaseError = error;
}

export { 
  app, auth, db, firebaseError, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  updatePassword, signOut, onAuthStateChanged, sendPasswordResetEmail, 
  collection, doc, setDoc, getDoc, onSnapshot 
};