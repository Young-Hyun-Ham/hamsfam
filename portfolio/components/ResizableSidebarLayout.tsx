// components/layout/ResizableSidebarLayout.tsx
"use client"

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { ExpandIcon, CollapseIcon } from "./Icons";

type SiderbarProps = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode; // content
};

export default function ResizableSidebarLayout({ header, sidebar, children }: SiderbarProps) {
  // const userinfo = await getUserServer(); // SSR에서 쿠키 확인
  // console.log("AppShell 렌더링, user===>", userinfo);
  const router = useRouter();
  const user = useStore((s: any) => s.user);
  const authChecked = useStore((s: any) => s.authChecked);
  const logout = useStore((s: any) => s.logout);
  const backend = useStore((s: any) => s.backend);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  useEffect(() => {
    if (!authChecked) return;

    if (!user) {
      router.push('/');
    }
   }, [authChecked, user, router]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [sidebarW, setSidebarW] = useState<number>(200);
  const [dragging, setDragging] = useState(false);

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v)); 
  }

  useEffect(() => { 
    localStorage.setItem("sidebar:w", String(sidebarW)); 
  }, [sidebarW]);

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

  async function handleLogout() {
    await logout();
    router.push('/');
  }
  
  // ---- menu popover ----
  const [menuOpen, setMenuOpen] = useState(false);

  const handleGoMenu = (type: string) => {
    switch (type) {
      case "menu":
        router.push("/admin/menu");
        break;
      case "settings":
        router.push("/admin/settings");
        break;
      default:
        break;
    }
    setMenuOpen(false);
  };

  const handleCollapse = () => {
    setSidebarCollapsed(true);
    setMenuOpen(false);
  };

  if (!authChecked) {
    // 아직 로그인 확인 중일 때 간단한 로딩 표시
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="text-sm text-gray-500">로그인 상태 확인 중...</span>
      </div>
    );
  }

  return (
    // 전체 높이 확보
    // <div className="min-h-screen bg-gray-50 text-gray-900">
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">

      {/* 상단 헤더 (고정) */}
      <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur shadow-sm">
        <div className="h-full px-4 flex items-center justify-between">
          {/* 좌측: 로고/탭 */}
          {header}
          {/* 우측: 사용자/세션 영역 */}
          <div className="flex items-center gap-3 text-sm">
            <span className="border-l pl-3">{user?.displayName ?? user?.name}&nbsp;({backend})</span>
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
      {/* <div ref={containerRef} className="flex min-h-[calc(100vh-3.5rem)] w-full relative"> */}
      <div
        ref={containerRef}
        className="flex flex-1 w-full relative overflow-hidden"
      >
        {/* 좌측 메뉴(가변 폭) */}
        <aside 
          style={{ width: sidebarCollapsed ? '32px' : `${sidebarW}px` }}
          className="relative bg-white min-w-0 overflow-y-auto"
        >
          <div className="flex items-center justify-between px-3 py-2">
            {sidebarCollapsed ? (
              // 펼치기 아이콘만 표시
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="size-7 grid place-items-center rounded-md hover:bg-gray-100 cursor-pointer"
              >
                {/* 펼치기 아이콘 */}
                <span className="text-xl">
                  <ExpandIcon />
                </span>
              </button>
            ) : (
              <>
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
                      <button 
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50"
                        style={{cursor:'pointer'}}
                        onClick={() => { handleGoMenu('menu') } }
                      >
                        메뉴관리
                      </button>
                      <button 
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50"
                        style={{cursor:'pointer'}}
                        onClick={() => { handleGoMenu('settings') } }
                      >
                        설정
                      </button>
                      <button 
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        style={{cursor:'pointer'}}
                        onClick={handleCollapse}
                      >
                        <CollapseIcon /> 숨기기
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {!sidebarCollapsed && (sidebar ?? (
            /* sidebar 메뉴가 없을 경우 초기 */
            <nav className="p-3 text-sm">
              <div className="mb-3 font-semibold">메뉴</div>
              <ul className="space-y-1">
                <li>
                  <a 
                    className="block rounded px-2 py-1 hover:bg-gray-100" 
                    href="/admin/user-info?path_ids=admin>user-info&depth=0"
                  >
                    사용자정보
                  </a>
                </li>
              </ul>
            </nav>
          ))}
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
