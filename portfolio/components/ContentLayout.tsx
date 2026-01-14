// app/components/ContentLayout.tsx
"use client"

import { useEffect, useMemo, useState } from "react"; 
import { usePathname, useRouter } from "next/navigation";

import { useStore } from "@/store";
import { api } from "@/lib/axios";
import RefreshTokenIcon from "./Icons";
import TokenTimer from "./TokenTimer";

type ContentProps = {
  header?: React.ReactNode;
  children: React.ReactNode; // content
  /** 
   * layout: (기존) main이 스크롤 컨테이너
   * page: 레이아웃은 고정, 페이지(children)가 스크롤 컨테이너
   */
  scrollMode?: "layout" | "page";
};

export default function ConnectLayout({
  header,
  children,
  scrollMode = "layout",
}: ContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useStore((s: any) => s.user);
  const authChecked = useStore((s: any) => s.authChecked);
  const logout = useStore((s: any) => s.logout);
  const backend = useStore((s: any) => s.backend);
  const token = useStore((s: any) => s.token);
  
  const [loading, setLoading] = useState(false);

  // board(및 board 하위)에서만 page 스크롤 모드
  // 필요하면 "/faq" 같은 것도 추가 가능
  const isPageScroll = useMemo(() => {
    if (!pathname) return false;
    return pathname === "/board" || 
          pathname.startsWith("/board/") || 
          pathname === "/ai-chat" || 
          pathname.startsWith("/ai-chat/") || 
          pathname === "/link" 
    ;
  }, [pathname]);

  useEffect(() => {
    if (!authChecked) return;

    if (!user) {
      router.push('/');
    }
   }, [authChecked, user, router]);

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  const handleRefresh = async () => {
    try {
      setLoading(true);
      // axios 인스턴스에 이미 withCredentials:true 설정되어 있으면 옵션 생략 가능
      const r = await api.post("/api/auth/refresh", {data: {userId: user.id}});
      // console.log("refresh result:", r.status, r.data, r);
      // 토큰 수정
      const { accessToken, ...nextUser } = r.data;
      useStore.getState().setAuth(nextUser, accessToken);
    } catch (e) {
      console.error("refresh failed:", e);
    } finally {
      setLoading(false);
    }
  }

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
    <div className="min-h-dvh bg-gray-50 text-gray-900 flex flex-col overflow-hidden">
      {/* 상단 헤더 (고정) */}
      <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur shadow-sm">
        <div className="h-full px-4 flex items-center justify-between">
          {/* 좌측: 로고/탭 */}
          {header}
          {/* 우측: 사용자/세션 영역 */}
          <div className="flex items-center gap-3 text-sm">
            {backend === 'postgres' ? (
              <>
                <TokenTimer />
                <button 
                  onClick={handleRefresh}
                  disabled={loading}
                  style={{ cursor: "pointer" }}
                >
                  {loading ? "refreshing..." : <RefreshTokenIcon className="w-4 h-4 text-gray-700" />}
                </button>
              </>
            ) : user?.email}
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
      <div className="flex flex-1 min-h-0 w-full relative overflow-hidden">
        <main
          className={[
            "relative flex-1 min-w-0 bg-gray-50",
            // 모드에 따라 스크롤 주체를 변경
            isPageScroll ? "overflow-hidden" : "overflow-y-auto",
          ].join(" ")}
        >
          {/* page 모드일 때는 children이 스크롤을 가지므로 padding 래퍼도 높이 체인 유지 */}
          <div className={isPageScroll ? "h-full min-h-0 p-6 overflow-hidden" : "p-6"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
