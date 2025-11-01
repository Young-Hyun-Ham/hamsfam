// components/layout/ResizableSidebarLayout.tsx
"use client"

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { useStore } from "@/store";

type SiderbarProps = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode; // content
};

export default function ResizableSidebarLayout({ header, sidebar, children }: SiderbarProps) {
  // const userinfo = await getUserServer(); // SSR에서 쿠키 확인
  // console.log("AppShell 렌더링, user===>", userinfo);
  const router = useRouter();
  const { user } = useStore();
  const logout = useStore((state: any) => state.logout);
  
   // ---- resizable sidebar ----
  const containerRef = useRef<HTMLDivElement>(null);
  const [sidebarW, setSidebarW] = useState<number>(200);
  const [dragging, setDragging] = useState(false);

  function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

  useEffect(() => { localStorage.setItem("sidebar:w", String(sidebarW)); }, [sidebarW]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const left = containerRef.current.getBoundingClientRect().left;
      setSidebarW(clamp(e.clientX - left, 200, 300));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // SSR에서 받은 유저 수화. 없으면 /api/auth/me로 1회 조회
  useEffect(() => {
    if (!user) {
       router.replace("/login");
    };
  }, [user]);

  function handleLogout() {
    logout().then(() => router.replace("/login"));
  }
  
  // ---- menu popover ----
  const [menuOpen, setMenuOpen] = useState(false);

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
            <span className="border-l pl-3">{user?.username}</span>
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
      <div ref={containerRef} className="flex min-h-[calc(100vh-3.5rem)] w-full relative">
        {/* 좌측 메뉴(가변 폭) */}
        <aside 
          style={{ width: `${sidebarW}px` }}
          className="relative bg-white min-w-0 overflow-y-auto"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-sm font-semibold">MENU</div>
            <div className="relative">
              <button
                className="size-7 grid place-items-center rounded-md hover:bg-gray-100 cursor-pointer"
                onClick={() => setMenuOpen(v => !v)}
              >
                {/* … 아이콘 */}
                <span className="leading-none text-xl">…</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-xl ring-1 ring-black/5 p-1 z-50"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50">메뉴 편집</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50">사이트맵</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50">메뉴 숨기기</button>
                </div>
              )}
            </div>
          </div>

          {sidebar ?? (
            /* sidebar 메뉴가 없을 경우 초기 */
            <nav className="p-3 text-sm">
              <div className="mb-3 font-semibold">메뉴</div>
              <ul className="space-y-1">
                <li><a className="block rounded px-2 py-1 hover:bg-gray-100" href="#">대시보드</a></li>
                <li><a className="block rounded px-2 py-1 hover:bg-gray-100" href="#">폼 목록</a></li>
                <li><a className="block rounded px-2 py-1 hover:bg-gray-100" href="#">시나리오</a></li>
                <li><a className="block rounded px-2 py-1 hover:bg-gray-100" href="#">API 리스트</a></li>
              </ul>
            </nav>
          )}
        </aside>
        
        {/* 리사이저(부드러운 그라데이션 + 드래그) */}
        <div
          onMouseDown={onMouseDown}
          className="relative w-3 cursor-col-resize select-none"
          title="드래그하여 메뉴 폭 조절 (최대 300px)"
        > 
          {/* 중앙 1px 라인만 표시 */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-neutral-300" />
          {/* 호버 시 살짝 진하게 */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 opacity-0 hover:opacity-100" />
        </div>

        {/* 우측 컨텐츠: 좌측 가장자리도 은은한 그림자 */}
        <main className="relative flex-1 min-w-0 overflow-y-auto bg-gray-50">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
