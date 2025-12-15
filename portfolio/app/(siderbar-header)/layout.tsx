// app/(sidebar-header)/layout.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import ResizableSidebarLayout from "@/components/ResizableSidebarLayout";
import HeaderNav from "@/components/HeaderNav";
import SidebarNav from "@/components/SidebarNav";
import type { NavItem, SidebarMenu } from "@/types/nav";
import { api } from "@/lib/axios";
import { useStore } from "@/store";

// 헤더 메뉴 조회 (클라이언트에서 axios 사용)
async function fetchHeaderMenus(): Promise<NavItem[]> {
  const res = await api.get("/api/menus");
  const data = res.data;
  return (data.items ?? []) as NavItem[];
}

// 사이드바 메뉴 조회
async function fetchSidebarMenus(up_menu: string): Promise<SidebarMenu[]> {
  const res = await api.get(`/api/submenus`, {
    params: { up_menu },
  });
  const data = res.data;
  return (data.items ?? []) as SidebarMenu[];
}

export default function SidebarSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    headerMenus,
    setHeaderMMenus,
    sidebarMenus,
    setSidebarMenus,
  } = useStore();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [menus, subMenus] = await Promise.all([
          fetchHeaderMenus(),
          fetchSidebarMenus("admin"),
        ]);

        if (!cancelled) {
          setHeaderMMenus(menus);
          setSidebarMenus(subMenus);
        }
      } catch (err) {
        console.error("admin layout 메뉴 로딩 실패:", err);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [setHeaderMMenus, setSidebarMenus]);

  return (
    <ResizableSidebarLayout
      header={<HeaderNav items={headerMenus} />}
      sidebar={<SidebarNav items={sidebarMenus} />}
    >
      {children}
    </ResizableSidebarLayout>
  );
}
