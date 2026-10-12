import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, enableIndexedDbPersistence } from "firebase/firestore";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app, auth, db;
let firebaseError = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);

  // PERSISTÊNCIA OFFLINE: cache local no navegador + fila automática de escritas
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Já existe persistência ativa em OUTRA aba do mesmo navegador. Normal — ignora.
      console.warn("Persistência offline já ativa em outra aba. Ignorado.");
    } else if (err.code === 'unimplemented') {
      // Navegador não suporta IndexedDB para este fim (raro).
      console.warn("Navegador não suporta persistência offline.");
    }
  });

} catch (error) {
  console.error("Falha ao inicializar Firebase:", error);
  firebaseError = error;
}

export { 
  app, auth, db, firebaseError, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  updatePassword, signOut, onAuthStateChanged, sendPasswordResetEmail, 
  collection, doc, setDoc, getDoc, onSnapshot, enableIndexedDbPersistence 
};