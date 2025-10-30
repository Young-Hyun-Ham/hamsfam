'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/app/lib/firebase';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { useStore } from '@/app/store';
import { useRouter } from 'next/navigation';

export default function TestLogin() {
  const router = useRouter();

  // 🔹 스토어 액션/상태 사용 (직접 Firebase API 호출 금지!)
  const initAuth = useStore(s => s.initAuth);
  const loginWithGoogle = useStore(s => s.loginWithGoogle);               // redirect 시작 (플래그 세팅 포함)
  const loginWithGooglePopup = useStore(s => s.loginWithGooglePopup);     // 팝업 폴백 (반드시 버튼 클릭에서)
  const logout = useStore(s => s.logout);

  const uid = useStore(s => s.user?.uid ?? null);
  const needPopupFallback = useStore(s => s.needPopupFallback);
  const loading = useStore(s => s.loading);
  const error = useStore(s => s.error);

  const [probes, setProbes] = useState<Record<string, any>>({});

  useEffect(() => {
    initAuth(); // ✅ 반드시 호출
  }, [initAuth]);

  useEffect(() => {
    // 환경/저장소 사전 진단 (참고용)
    const runProbes = async () => {
      let localOk = false, idbOk = false;
      try { localStorage.setItem('__probe__', '1'); localOk = localStorage.getItem('__probe__') === '1'; } catch {}
      try { /* @ts-ignore */ idbOk = !!(window.indexedDB && window.indexedDB.open); } catch {}
      setProbes({
        origin: window.location.origin,
        hash: window.location.hash,
        localStorage: localOk,
        indexedDB: idbOk,
        authDomain: (auth as any).config?.authDomain,
        apiKey: (auth as any).config?.apiKey?.slice(0, 6) + '…',
        redirectingFlag: sessionStorage.getItem('auth:redirecting') ?? '(none)',
      });
    };
    runProbes();

    // 순수 진단용 로그 (동작 판단은 스토어가 함)
    // getRedirectResult(auth).then(res => {
    //   console.log('[TEST] getRedirectResult:', res);
    // }).catch(e => console.error('[TEST] getRedirectResult error:', e));

    // const unsub = onAuthStateChanged(auth, u => {
    //   console.log('[TEST] onAuthStateChanged:', u?.uid, u?.email);
    // });
    // return () => unsub();
  }, []);

  const onLogout = async () => {
    await logout();
    router.replace('/'); // 필요 경로로
  };

  return (
    <div style={{padding:24}}>
      <h3>Probes</h3>
      <pre>{JSON.stringify(probes, null, 2)}</pre>

      <h3>User</h3>
      <p>uid: {uid ?? '(none)'} {loading ? ' (loading...)' : ''}</p>
      {error ? <p style={{color:'tomato'}}>error: {error}</p> : null}

      {/* ✅ 반드시 스토어 액션으로 호출 (flag 세팅 포함) */}
      <button onClick={loginWithGoogle} disabled={loading}>
        Google Redirect (store)
      </button>

      {/* ⬇️ 리다이렉트 복귀 후 안붙을 때만 사용자 클릭으로 팝업 */}
      {needPopupFallback && (
        <>
          <div style={{marginTop:12, padding:8, border:'1px solid #888'}}>
            리다이렉트 세션 복구가 브라우저 설정으로 차단된 것 같아요.
            <div style={{marginTop:8}}>
              <button onClick={loginWithGooglePopup} disabled={loading}>
                Google 팝업으로 로그인
              </button>
            </div>
          </div>
        </>
      )}

      {uid ? (
        <>
          <br/>
          <button onClick={onLogout}>로그아웃</button>
        </>
      ) : null}
    </div>
  );
}
