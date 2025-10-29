'use client';

import { useEffect } from 'react';
import { useStore } from '@/app/store';
import LoginPage from '@/app/login/page';
// 예시: 로그인 성공시 보여줄 메인 페이지
import TodosPage from '@/app/todos/page';

export default function Page() {
  const initAuth = useStore(s => s.initAuth);
  const user = useStore(s => s.user);
  const loading = useStore(s => s.loading);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (loading) return null;

  return user ? <TodosPage /> : <LoginPage />;
}
