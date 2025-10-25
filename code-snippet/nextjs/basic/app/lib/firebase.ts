import { initializeApp, getApps } from "firebase/app";
// --- 👇 [수정] collection, getDocs, writeBatch 추가 ---
import { getFirestore, serverTimestamp, deleteDoc, doc, getDoc, setDoc, updateDoc, limit, startAfter, collection, addDoc, getDocs, writeBatch } from "firebase/firestore";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase 초기화
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const db = getFirestore(app);
export const auth = getAuth(app);
// --- 👇 [수정] 추가된 함수들을 export ---
export { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, serverTimestamp, deleteDoc, doc, getDoc, setDoc, updateDoc, limit, startAfter, collection, addDoc, getDocs, writeBatch };