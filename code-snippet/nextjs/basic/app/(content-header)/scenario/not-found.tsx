// app/chat/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-md border p-6 bg-white">
      <h2 className="text-lg font-semibold mb-2">/chat 페이지를 찾을 수 없습니다.</h2>
      <Link href="/chat" className="text-blue-600 hover:underline">
        /chat로 돌아가기
      </Link>
    </div>
  );
}
