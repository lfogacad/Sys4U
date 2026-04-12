import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCbLw8-NjkirA0caHrtPQjcT5OEJjaK8aU",
  authDomain: "sys4u-ariquemes.firebaseapp.com",
  projectId: "sys4u-ariquemes",
  storageBucket: "sys4u-ariquemes.firebasestorage.app",
  messagingSenderId: "836549091511",
  appId: "1:836549091511:web:78bbcdaf8e297669742d32",
  measurementId: "G-S3YNE8Q375"
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