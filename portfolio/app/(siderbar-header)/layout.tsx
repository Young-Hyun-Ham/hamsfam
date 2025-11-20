// app/(sidebar-header)/layout.tsx

import type { ReactNode } from "react";
import ResizableSidebarLayout from "@/components/ResizableSidebarLayout";
import HeaderNav from "@/components/HeaderNav";
import SidebarNav from "@/components/SidebarNav";
import type { NavItem, SidebarMenu } from "@/types/nav";
import { api } from "@/lib/axios";
import { headers } from "next/headers";

async function loadMenus(): Promise<NavItem[]> {
  const res = await api.get("/api/menus");
  const data = await res.data;
  return (data.items ?? []) as NavItem[];
}
async function loadSibarMenus(up_menu: string): Promise<SidebarMenu[]> {
  const res = await api.get(`/api/submenus?up_menu=${up_menu}`);
  const data = await res.data;
  return (data.items ?? []) as SidebarMenu[];
}

export default async function SidebarSectionLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  let hosturl = ""; // 요청 헤더에서 origin 추출 (없으면 "")
  let url = ""; // 요청 헤더에서 referer 추출 (없으면 "")
  for (const key of h.keys()) {
    // console.log(`header: ${key} = ${h.get(key)}`);
    if (key === 'host') {
      hosturl = h.get(key) ?? "";
    }
    if (key === 'referer') { // 이전 페이지 URL
      url = h.get(key) ?? "";
    }
  }
  url = url.replace(hosturl, "");               // url에서 hosturl 제거
  const last = url.replace(/\/+$/,'')           // 끝 슬래시 제거
                      .split('/')               // ["", "foo", "bar"]
                      .filter(Boolean)          // ["foo", "bar"]
                      .pop() ?? '';             // "bar"
  
  const menus = await loadMenus();
  const sidebarMenus = await loadSibarMenus("admin");

  return (
      <ResizableSidebarLayout
        header={<HeaderNav items={menus} />}
        sidebar={<SidebarNav items={sidebarMenus} />}
      >
      {children}
    </ResizableSidebarLayout>
  );
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;        // 캐시 안 함
export const fetchCache = 'force-no-store'; // fetch도 no-store 