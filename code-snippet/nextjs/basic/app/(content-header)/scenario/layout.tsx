// app/layout.tsx
import type { ReactNode } from "react";
import "../../globals.css"; // Tailwind를 쓰면 전역 CSS에서 @tailwind 지시문 포함

export const metadata = {
  title: "샘플 앱",
  description: "Next.js App Router 샘플",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
    <header className="h-12 sticky top-0 z-20 bg-white/90 backdrop-blur border-b flex items-center px-4">
        <strong className="mr-2">샘플 앱</strong>
        <span className="text-sm text-gray-500">/ 루트 레이아웃</span>
    </header>
    <main className="max-w-5xl mx-auto p-6">{children}</main>
    </>
  );
}
 