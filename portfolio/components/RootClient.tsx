// components/RootClient.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import Login from '@/app/(content)/login/page';

export default function RootClient({ initialUser }: { initialUser: any }) {
  const router = useRouter();
  const user = useStore((s: any) => s.user);
  const setUser = useStore((s: any) => s.setUser);

  // 서버에서 가져온 initialUser 를 Zustand 에 반영
  useEffect(() => {
    if (initialUser && !user) {
      setUser(initialUser);
    }
  }, [initialUser, user, setUser]);

  // Zustand 에 user 가 있으면 /main 으로
  useEffect(() => {
    if (user) {
      router.replace('/main');
    }
  }, [user, router]);

  return <Login />;
}
