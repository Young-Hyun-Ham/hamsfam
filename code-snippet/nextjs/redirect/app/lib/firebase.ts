// app/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult,
  onAuthStateChanged, setPersistence, browserLocalPersistence, UserCredential
} from 'firebase/auth';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  // ⚠️ vercel 배포 도메인과 반드시 일치
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!, // ex) "redirect-nine-phi.vercel.app"
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const watchAuth = (cb: (user: any) => void) => onAuthStateChanged(auth, cb);

// 세션 스토리지 점검 (리다이렉트 사전 메타 저장소)
export function isSessionStorageOk() {
  try {
    const k = '__t__';
    sessionStorage.setItem(k, '1'); sessionStorage.removeItem(k);
    return true;
  } catch { return false; }
}

// 중복 리다이렉트 방지 플래그 키
const REDIRECT_FLAG = 'redirectingFlag';

// 무조건 리다이렉트 시작
export async function startGoogleRedirectLogin() {
  try {
    // 로그인 이후 유지 용도(Local) — 리다이렉트 사전 메타는 어차피 sessionStorage 사용
    await setPersistence(auth, browserLocalPersistence);
  } catch {} // 실패해도 진행

  try {
    sessionStorage.setItem(REDIRECT_FLAG, '1');
  } catch {}
  await signInWithRedirect(auth, googleProvider);
}

// 리다이렉트 결과는 앱 시작 시 1번만 복구
let _redirectChecked = false;
export async function tryGetRedirectResultOnce(): Promise<{
  cred: UserCredential | null;
  hadRedirectIntent: boolean;
  storageOk: boolean;
}> {
  const hadRedirectIntent = sessionStorage.getItem(REDIRECT_FLAG) === '1';
  const storageOk = isSessionStorageOk();

  if (_redirectChecked) return { cred: null, hadRedirectIntent, storageOk };
  _redirectChecked = true;

  try {
    const cred = await getRedirectResult(auth); // 없으면 null
    // 성공/실패/무관: 의도 플래그는 여기서 내려준다(루프 방지)
    try { sessionStorage.removeItem(REDIRECT_FLAG); } catch {}
    return { cred, hadRedirectIntent, storageOk };
  } catch {
    try { sessionStorage.removeItem(REDIRECT_FLAG); } catch {}
    return { cred: null, hadRedirectIntent, storageOk };
  }
}
