// app/chat/error.tsx
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <h2 className="font-semibold text-red-700 mb-2">문제가 발생했어요.</h2>
      <p className="text-sm text-red-600 mb-3">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-red-600 hover:bg-red-700 text-white px-3 py-1"
      >
        다시 시도
      </button>
    </div>
  );
}
