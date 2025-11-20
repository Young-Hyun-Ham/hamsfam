// app/(content-header)/layout.tsx (서버컴포넌트)
import type { ReactNode } from "react";
import { api } from "@/lib/axios";

import type { NavItem } from '../../types/nav';
import HeaderNav from '../../components/HeaderNav';
import ContentLayout from "../../components/ContentLayout";

async function loadMenus(): Promise<NavItem[]> {
  // 같은 Next 앱 내부 API라면 상대경로 fetch 가능
  const res = await api.get("/api/menus");
  const data = await res.data;
  return (data.items ?? []) as NavItem[];
}

export default async function MainSectionLayout({ children }: { children: ReactNode }) {
  const menus = await loadMenus();

  return (
    <ContentLayout
      header={<HeaderNav items={menus} />}
    >
    {children}
    </ContentLayout>
  );
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;        // 캐시 안 함
export const fetchCache = 'force-no-store'; // fetch도 no-store 
