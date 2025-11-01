// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import Login from '@/app/(content)/login/page';

export default function RootPage() {
  const router = useRouter();
  const initAuth = useStore((s: any) => s.initAuth);
  const user = useStore((s: any) => s.user);

  useEffect(() => { initAuth(); }, [initAuth]);

  useEffect(() => {
    if (user) router.replace('/main');  // 로그인 완료시 /main으로
  }, [user, router]);

  return <Login />;           // 로그인 전에는 루트에서 로그인 화면만
}
