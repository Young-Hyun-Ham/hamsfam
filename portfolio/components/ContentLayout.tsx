// app/components/AppShell.tsx
"use client"

import { useEffect, useState } from "react"; 
import { useRouter } from "next/navigation";

import { useStore } from "@/store";
import { api } from "@/lib/axios";

type ContentProps = {
  header?: React.ReactNode;
  children: React.ReactNode; // content
};

export default function ConnectLayout({ header, children }: ContentProps) {
  const router = useRouter();
  const { user } = useStore();
  const logout = useStore((state: any) => state.logout);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
   }, []);

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  const handleRefresh = async () => {
    try {
      setLoading(true);
      // axios 인스턴스에 이미 withCredentials:true 설정되어 있으면 옵션 생략 가능
      const r = await api.post("/api/auth/refresh", {});
      // console.log("refresh result:", r.status, r.data);

      // (선택) 새 토큰으로 사용자 정보 재조회
      // const me = await api.get("/api/auth/me");
      // setAuth(me.data.user)
    } catch (e) {
      console.error("refresh failed:", e);
    } finally {
      setLoading(false);
    }
  }

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
            
            <button 
              onClick={handleRefresh}
              disabled={loading}
              style={{ cursor: "pointer" }}
            >
              {loading ? "refreshing..." : "[ refresh token ]"}
            </button>
            <span className="border-l pl-3">{user?.displayName ?? user?.username}</span>
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
