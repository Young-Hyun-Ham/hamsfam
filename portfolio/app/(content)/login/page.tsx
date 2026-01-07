// app/(content)/login/page.tsx
'use client';

import { FC, useState } from 'react';
import { useStore } from '@/store';
import { useTranslations } from '@/hooks/useTranslations';

import styles from './Login.module.css';

const Login: FC = () => {
  const backend = useStore((state: any) => state.backend);
  const setLoginType = useStore((state: any) => state.setLoginType);
  const loginWithGoogle = useStore((state: any) => state.loginWithGoogle);
  const loginWithTestId = useStore((state: any) => state.loginWithTestId);
  const loginWithEmail = useStore((state: any) => state.loginWithEmail);
  const { t } = useTranslations();

  // 테스트 ID 로그인 상태
  const [testId, setTestId] = useState('');

  const handleTestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginWithTestId(testId);
  };

  // 이메일/비밀번호 로그인 상태 (공통)
  const [email, setEmail] = useState('sodlfmagka2@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      // router.push("/main");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = () => {
    window.location.href = `${
      process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000'
    }/api/oauth/google?redirect=/main`;
  };

  return (
    <>
      {backend === 'postgres' ? (
        // ================== Postgres 백엔드: 이메일/비밀번호 + 구글 ==================
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <form
            onSubmit={handleEmailLogin}
            className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4"
          >
            <h1 className="text-2xl font-semibold text-center text-gray-800">로그인</h1>

            <div>
              <label className="block text-sm mb-1 text-gray-600">이메일</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2 text-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-600">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 text-gray-700"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              disabled={loading}
              className="w-full py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <button
              type="button"
              // onClick={onGoogle}
              onClick={loginWithGoogle} // 팝업 구글
              className="w-full py-2 rounded border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-800 mt-1"
              disabled={loading}
            >
              Google로 계속하기
            </button>
          </form>
        </div>
      ) : (
        // ================== Firebase 백엔드: 구글 + 테스트 ID + 이메일/비밀번호 ==================
        <div className={styles.login}>
          <div className={styles.titleParent}>
            <b className={styles.title}>
              <p className={styles.p}>안녕하세요!</p>
              <p className={styles.p}>계속하려면 로그인해</p>
              <p className={styles.p}>주세요.</p>
            </b>

            <div className={styles.card}>
              {/* Google 로그인 버튼 */}
              <button
                onClick={loginWithGoogle}
                className={styles.btngooglePopup}
                disabled={loading}
              >
                {t('signInWithGoogle')}
              </button>

              {/* 구분선 */}
              <div className={styles.dividerRow}>
                <div className={styles.divider} />
                <span className={styles.or}>{t('loginMethodToggle')}</span>
                <div className={styles.divider} />
              </div>

              {/* ===== 테스트 ID 로그인 ===== */}
              <form onSubmit={handleTestLogin} className={styles.formBlock}>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    value={testId}
                    onChange={(e) => setTestId(e.target.value)}
                    placeholder={t('testIdPlaceholder')}
                    className={styles.input}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.btntestlogin}
                  disabled={!testId.trim() || loading}
                >
                  <span className={styles.btntestloginlabel}>
                    {t('signInWithTestId')}
                  </span>
                </button>
              </form>

              {/* ===== 이메일/비밀번호 로그인 ===== */}
              <form onSubmit={handleEmailLogin} className={styles.formBlock}>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일을 입력하세요"
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.inputWrapper}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className={styles.input}
                    required
                  />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button
                  type="submit"
                  className={styles.btnEmailLogin}
                  disabled={loading}
                >
                  <span className={styles.btntestloginlabel}>
                    이메일로 로그인
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
