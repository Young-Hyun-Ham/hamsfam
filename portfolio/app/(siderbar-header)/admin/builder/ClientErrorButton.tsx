// app/(siderbar-header)/admin/builder/ClientErrorButton.tsx

import { useState } from "react";

export default function ClientErrorButton() {
  const [boom, setBoom] = useState(false);
  if (boom) {
    // 렌더 중 예외를 던져야 error.tsx가 잡는다 (이벤트 핸들러 안에서 직접 throw는 X)
    throw new Error("사용자가 버튼으로 발생시킨 에러");
  }
  return (
    <button
      onClick={() => setBoom(true)}
      className="rounded-md border px-3 py-1 hover:bg-gray-100"
    >
      클라이언트 에러 발생
    </button>
  );
}
