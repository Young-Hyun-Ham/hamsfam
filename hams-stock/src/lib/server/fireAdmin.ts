// src/lib/server/fireAdmin.ts
import admin from "firebase-admin";
import { FIREBASE_SERVICE_ACCOUNT_JSON } from "$env/static/private";

function init() {
  if (admin.apps.length) return admin.app();

  // 배포 환경(firebase functions 등)에서는 기본 자격증명으로 보통 OK
  // 로컬에서 서비스계정 JSON을 env로 넣고 싶으면 FIREBASE_SERVICE_ACCOUNT_JSON 사용
  const saJson = FIREBASE_SERVICE_ACCOUNT_JSON;

  if (saJson) {
    const serviceAccount = JSON.parse(saJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.initializeApp();
}

export const adminApp = init();
export const adminDb = admin.firestore();
export { admin };
