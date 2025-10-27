// app/login/page.tsx
'use client';

import { FC, useState } from 'react';
import styles from '@/app/login/Login.module.css';
import { useStore } from '@/app/store';
import { useTranslations } from '@/app/hooks/useTranslations';

const Login: FC = () => {
  const loginWithGoogle = useStore((state: any) => state.loginWithGoogle);
  const loginWithTestId = useStore((state: any) => state.loginWithTestId);
  const { t } = useTranslations();

  const [testId, setTestId] = useState('');

  const handleTestLogin = (e: any) => {
    e.preventDefault();
    loginWithTestId(testId);
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

        {/* Google 로그인 버튼 */}
        <button onClick={loginWithGoogle} className={styles.btngooglePopup}>
          {t('signInWithGoogle')}(popup)
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
  );
};

export default Login;
