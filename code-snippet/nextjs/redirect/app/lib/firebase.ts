// app/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, UserCredential
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!, // ⭐ 현재 배포 도메인과 일치 권장
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const watchAuth = (cb: (user: any) => void) => onAuthStateChanged(auth, cb);

// 세션 스토리지가 동작 가능한지(프라이빗/제3자쿠키 차단 체크 대용)
export function isSessionStorageOk() {
  try {
    const k = '__t__';
    sessionStorage.setItem(k, '1');
    sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// 리다이렉트 결과 복구(한 번만)
let _redirectChecked = false;
export async function tryGetRedirectResultOnce(): Promise<UserCredential | null> {
  if (_redirectChecked) return null;
  _redirectChecked = true;
  try {
    const cred = await getRedirectResult(auth);
    return cred; // 없으면 null
  } catch (e) {
    // 복구 자체가 막힌 경우도 여기로 떨어질 수 있음
    return null;
  }
}

// 스마트 로그인: 팝업 우선 → 실패 시 리다이렉트
export async function smartGoogleLogin() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    // 팝업 차단/미지원 → 리다이렉트로 폴백
    const code = err?.code || '';
    const popupBlocked =
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment';
    if (popupBlocked) {
      await signInWithRedirect(auth, googleProvider);
      return null; // 리다이렉트로 나감
    }
    throw err;
  }
}
