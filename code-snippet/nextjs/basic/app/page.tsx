// app/page.tsx
'use client';

import { useStore } from '@/app/store';
import Login from '@/app/login/page';
import Todos from '@/app/todos/page';
import { useEffect } from 'react';

export default function MainPage() {
  const initAuth = useStore((s:any) => s.initAuth);
  const user = useStore((s:any) => s.user);

  useEffect(() => { initAuth(); }, [initAuth]);
  
  return (
    <> {user ? <Todos /> : <Login /> } </>
  );
}

