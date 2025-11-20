// app/(content)/login/page.tsx
'use client';

import { FC, useState } from 'react';
import { useStore } from '@/store';
import { api } from "@/lib/axios";
import { useTranslations } from '@/hooks/useTranslations';

import styles from './Login.module.css';

const Login: FC = () => {
  const backend = useStore((state: any) => state.backend);
  const loginWithGoogle = useStore((state: any) => state.loginWithGoogle);
  const loginWithTestId = useStore((state: any) => state.loginWithTestId);
  const { t } = useTranslations();

  const [testId, setTestId] = useState('');

  const handleTestLogin = (e: any) => {
    e.preventDefault();
    loginWithTestId(testId);
  };

  
  const loginWithEmail = useStore((state: any) => state.loginWithEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await loginWithEmail(email, password);
      // router.push("/main");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err)); 
    }
  };
  
  const onGoogle = () => {
    // 시작 라우트로 이동 → 구글 → 콜백 → 우리 JWT 쿠키 발급 → /로 복귀
    // window.location.href = `${API_BASE}/api/oauth/google?redirect=/main`;
    // api.get(`/api/oauth/google?redirect=/main`);
    window.location.href = `${process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:5000'}/api/oauth/google?redirect=/main`;
  };

  return (
    <>
      {backend === 'postgres' ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-center text-gray-800">로그인</h1>
            <div>
              <label className="block text-sm mb-1 text-gray-600">이메일</label>
              <input type="text" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-gray-400" required />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-600">비밀번호</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-3 py-2 text-gray-400" required />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button disabled={loading} className="w-full py-2 rounded bg-black text-white disabled:opacity-50">
              {loading ? "로그인 중..." : "로그인"}
            </button>
            <button
              type="button"
              onClick={onGoogle}
              className="w-full py-2 rounded border border-gray-100 bg-gray-400 hover:bg-gray-500"
              disabled={loading}
            >
              Google로 계속하기
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.login}>
          <div className={styles.titleParent}>
            <b className={styles.title}>
              <p className={styles.p}>안녕하세요!</p>
              <p className={styles.p}>계속하려면 로그인해</p>
              <p className={styles.p}>주세요.</p>
            </b>

            <div className={styles.card} />

            {/* Google 로그인 버튼 */}
            <button onClick={loginWithGoogle} className={styles.btngooglePopup}>
              {t('signInWithGoogle')}
            </button>
            
            <div className={styles.dividerleft} />
            <div className={styles.or}>{t('loginMethodToggle')}</div>
            <div className={styles.dividerright} />

            {/* 입력창 */}
            <form onSubmit={handleTestLogin}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  placeholder={t('testIdPlaceholder')}
                  className={styles.input}
                />
              </div>

              {/* 테스트 로그인 버튼 */}
              <button
                type="submit"
                className={styles.btntestlogin}
                disabled={!testId.trim()}
              >
                <span className={styles.btntestloginlabel}>
                  {t('signInWithTestId')}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
