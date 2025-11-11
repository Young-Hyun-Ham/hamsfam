// app/(main)/page.tsx
"use client";

import { FC, useEffect } from "react";
import { useState } from "react";

import { api } from "@/lib/axios";
import { useStore } from "@/store";

const Main: FC = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useStore();

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
    <section>
      <button 
        onClick={handleRefresh}
        disabled={loading}
        style={{ cursor: "pointer" }}
      >
        {loading ? "refreshing..." : "[ refresh token ]"}
      </button>
      <hr />
      <div>
        main dashboard : {JSON.stringify(user)}
      </div>
    </section>
  );
}

export default Main;
