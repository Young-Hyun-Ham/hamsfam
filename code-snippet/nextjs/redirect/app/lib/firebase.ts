// app/lib/firebase.ts
'use client';

import { initializeApp, getApps, getApp, setLogLevel } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInAnonymously,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';

function must(name: string, v: string | undefined) {
  if (!v) throw new Error(`[ENV] ${name} is missing`);
  return v;
}

const firebaseConfig = {
  apiKey: must('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: must('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN), // ex) hamsfam.firebaseapp.com
  projectId: must('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  appId: must('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  storageBucket: must('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET), // ex) hamsfam.appspot.com
  messagingSenderId: must('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
};

// 내부 디버그 로그
setLogLevel('debug');

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth 1회 + 다중 퍼시스턴스 + 리다이렉트 리졸버
let _auth: ReturnType<typeof getAuth>;
try {
  _auth = initializeAuth(app, {
    persistence: [browserLocalPersistence, indexedDBLocalPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  _auth = getAuth(app);
}
export const auth = _auth;
export const db = getFirestore(app);

console.log('[AUTH] runtime config:', {
  origin: typeof window !== 'undefined' ? window.location.origin : '(ssr)',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  storageBucket: firebaseConfig.storageBucket,
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('email');

export async function startGoogleRedirectLogin() {
  // 시작 전 아티팩트 정리 (직전 실패 잔여물 제거)
  hardResetAuthArtifacts();

  // 계정선택 강제(이전 세션 잔상 최소화)
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  sessionStorage.setItem('auth:redirecting', '1');
  await signInWithRedirect(auth, googleProvider);
}

export async function handleRedirectCallbackOnce(): Promise<User | null> {
  try {
    const res = await getRedirectResult(auth);
    console.log('[AUTH] getRedirectResult:', res);
    // sessionStorage.removeItem('auth:redirecting');
    return res?.user ?? null;
  } catch (e) {
    console.error('[AUTH] getRedirectResult error:', e);
    // sessionStorage.removeItem('auth:redirecting');
    return null;
  }
}

export async function ensureUserDoc(user: User) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: serverTimestamp(),
      provider: user.providerData?.[0]?.providerId ?? 'unknown',
    });
  }
}
export async function getOrInitSettings(user: User) {
  const sref = doc(db, 'settings', user.uid);
  const ssnap = await getDoc(sref);
  if (!ssnap.exists()) {
    await setDoc(sref, { theme: 'light', language: 'ko', createdAt: serverTimestamp() });
    return { theme: 'light', language: 'ko' };
  }
  return ssnap.data();
}
export async function testLogin(displayName: string) {
  const cred = await signInAnonymously(auth);
  if (auth.currentUser && displayName.trim()) {
    await updateProfile(auth.currentUser, { displayName });
  }
  return cred.user;
}
export async function signOutAll() { await signOut(auth); }
export function watchAuth(cb: (user: User | null) => void) {
  console.log('[AUTH] watchAuth subscribed');
  return onAuthStateChanged(auth, (u) => {
    console.log('[AUTH] onAuthStateChanged user:', u?.uid, u?.email);
    cb(u);
  });
}

// 리다이렉트/세션 관련 잔여 키 싹 정리
export function hardResetAuthArtifacts() {
  try {
    // Firebase가 쓰는 로컬/세션 키들 정리
    const rm = (s: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i)!;
        if (
          k.startsWith('firebase:') ||        // firebase:* 전반
          k.startsWith('g_state') ||          // 구글 g_state
          k.startsWith('gState') ||           // 변종
          k.includes('redirect')              // redirect 관련
        ) keys.push(k);
      }
      keys.forEach(k => s.removeItem(k));
    };
    rm(localStorage);
    rm(sessionStorage);
  } catch {}
}

