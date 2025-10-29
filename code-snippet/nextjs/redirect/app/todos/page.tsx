'use client';
import { useStore } from '@/app/store';
import { useRouter } from 'next/navigation';

export default function HeaderBar() {
  const router = useRouter();
  const user = useStore(s => s.user);
  const logout = useStore(s => s.logout);
  const loading = useStore(s => s.loading);

  const onLogout = async () => {
    await logout();
    router.replace('/'); // 로그인 화면 등으로 이동
  };

  if (!user) return null;

  return (
    <>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <h1>welcode todos!!!</h1>
      </div>
      <span>{user.displayName ?? user.email ?? user.uid}</span>
      <br/>
      <span>{JSON.stringify(user)}</span>
      <button onClick={onLogout} disabled={loading}>로그아웃</button>
    </>
  );
}
