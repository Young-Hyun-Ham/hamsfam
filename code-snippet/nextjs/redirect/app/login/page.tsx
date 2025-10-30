'use client';

import { FC, useEffect, useState } from 'react';
import styles from '@/app/login/Login.module.css';
import { useStore } from '@/app/store';

// 너의 번역 훅을 그대로 사용
import { useTranslations } from '@/app/hooks/useTranslations';

// 페이지 진입 시 initAuth를 꼭 호출 (리다이렉트 콜백/상태구독)
const LoginPage: FC = () => {
  const { t } = useTranslations();
  const initAuth = useStore(s => s.initAuth);
  const loginWithGoogle = useStore(s => s.loginWithGoogle);
  // const handleTestLoginAction = useStore(s => s.handleTestLogin);
  const loading = useStore(s => s.loading);
  const error = useStore(s => s.error);

  const [testId, setTestId] = useState('');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId.trim()) return;
    // await handleTestLoginAction(testId.trim());
  };

  return (
    <div className={styles.login}>
      <div className={styles.titleParent}>
        <b className={styles.title}>
          <p className={styles.p}>안녕하세요!</p>
          <p className={styles.p}>계속하려면 로그인해</p>
          <p className={styles.p}>주세요.</p>
        </b>

        <div className={styles.card} />

        {/* Google 로그인 버튼 (현재창 리다이렉트) */}
        <button
          onClick={async () => {
            console.log('[AUTH] start redirect login');
            await loginWithGoogle();
          }}
          className={styles.btngooglePopup}
          disabled={loading}
        >
          {loading ? t('loading') : t('signInWithGoogle')}
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
            disabled={!testId.trim() || loading}
          >
            <span className={styles.btntestloginlabel}>
              {t('signInWithTestId')}
            </span>
          </button>
        </form>

        {/* 에러 표시(옵션) */}
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    </div>
  );
};

export default LoginPage;
