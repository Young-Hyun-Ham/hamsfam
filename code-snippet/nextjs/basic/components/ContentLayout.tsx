// app/components/AppShell.tsx
"use client"

import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { useEffect, useRef, useState } from "react"; 

type ContentProps = {
  header?: React.ReactNode;
  children: React.ReactNode; // content
};

export default function ConnectLayout({ header, children }: ContentProps) {
  const router = useRouter();

  const initAuth = useStore((s: any) => s.initAuth);
  const { user } = useStore();
  const logout = useStore((state: any) => state.logout);

  useEffect(() => { initAuth(); }, [initAuth]);

  const handleLogout = async () => {
    await logout();           // 로그아웃 처리
    router.push("/");         // 메인 or 로그인 페이지로 이동
  };

  return (
    // 전체 높이 확보
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 상단 헤더 (고정) */}
      <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur shadow-sm">
        <div className="h-full px-4 flex items-center justify-between">
          {/* 좌측: 로고/탭 */}
          {header}
          {/* 우측: 사용자/세션 영역 */}
          <div className="flex items-center gap-3 text-sm">
            <span className="border-l pl-3">{user?.displayName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md hover:cursor-pointer"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 하단 바디 (좌/우 그리드) */}
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full relative">
        {/* 우측 컨텐츠: 좌측 가장자리도 은은한 그림자 */}
        <main className="relative flex-1 min-w-0 overflow-y-auto bg-gray-50">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
