// components/AuthInit.tsx
'use client';
import { useEffect } from 'react';
import { useStore } from '@/store';

export default function AuthInit() {
  const initAuth = useStore((s: any) => s.initAuth);
  useEffect(() => { initAuth(); }, [initAuth]);
  return null; // 화면에 아무것도 렌더 안 함
}
