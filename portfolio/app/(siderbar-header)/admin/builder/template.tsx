// app/(siderbar-header)/admin/builder/template.tsx
"use client";

import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  // 템플릿은 레이아웃과 비슷하지만 페이지 전환 때마다 새로 렌더됩니다.
  return <>{children}</>;
}
