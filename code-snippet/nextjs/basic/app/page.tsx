// apps/frontend/src/app/page.tsx
import styles from './LoginScreen.module.css';

export default async function MainPage() {
  return (
    <div className={styles.loginscreen}>
      <b className={styles.title}>
        <p className={styles.p}>안녕하세요!</p>
        <p className={styles.p}>계속하려면 로그인해</p>
        <p className={styles.p}>주세요.</p>
      </b>
      <div className={styles.card} />
      <div className={styles.btngoogle} />
      <div className={styles.btngooglelabel}>Google 계정으로 로그인</div>
      <div className={styles.dividerleft} />
      <div className={styles.or}>또는</div>
      <div className={styles.dividerright} />
      <div className={styles.input} />
      <div className={styles.inputplaceholder}>테스트 ID 입력</div>
      <div className={styles.btntestlogin} />
      <div className={styles.btntestloginlabel}>테스트 ID로 로그인</div>
    </div>
  );
}
