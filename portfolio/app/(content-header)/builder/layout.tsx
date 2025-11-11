// app/(content-header)/builder/layout.tsx

import type { ReactNode } from "react";

export const metadata = {
  title: "샘플 앱",
  description: "Next.js App Router 샘플",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
    {children}
    </>
  );
}
 