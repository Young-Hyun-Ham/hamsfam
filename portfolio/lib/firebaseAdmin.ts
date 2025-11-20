// lib/firebaseAdmin.ts
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// 🔥 Firebase Admin 초기화 (중복 방지)
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("❌ Firebase 환경변수 누락: .env.local 확인 필요 (FIREBASE_*)");
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// Firestore (기존 adminDb와 동일)
export const adminDb = getFirestore();

// Firebase Admin Auth (추가된 부분)
export const adminAuth = getAuth();

// default export로 전체 admin app을 넘길 수도 있음
export default {
  adminDb,
  adminAuth,
};
