// app/(sidebar-header)/admin/board/components/modal/_components/ReplyComposer.tsx
"use client";

import { useEffect, useRef } from "react";

type ReplyingTo = null | { id: string; authorName: string };

type Props = {
  open: boolean;
  replyText: string;
  onChange: (v: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  replyingTo: ReplyingTo;
  onCancelReplyingTo: () => void;
};

export function ReplyComposer({
  open,
  replyText,
  onChange,
  canSubmit,
  submitting,
  onSubmit,
  replyingTo,
  onCancelReplyingTo,
}: Props) {
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!replyingTo) return;
    requestAnimationFrame(() => {
      replyRef.current?.focus();
      replyRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [open, replyingTo]);

  return (
    <div className="p-5">
      <textarea
        ref={replyRef}
        value={replyText}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[96px] rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                   focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        placeholder={replyingTo ? "답글을 입력하세요" : "댓글을 입력하세요"}
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {replyingTo ? "답글 등록 시 트리에 자동으로 정렬됩니다." : "최상위 댓글로 등록됩니다."}
          {replyingTo ? (
            <>
              <span className="mx-2 text-gray-300">|</span>
              <button onClick={onCancelReplyingTo} className="text-xs text-gray-500 hover:text-gray-700">
                답글 취소
              </button>
            </>
          ) : null}
        </div>

        <button
          className={[
            "rounded-2xl px-4 py-2 text-sm font-medium shadow-lg ring-1 transition",
            canSubmit && !submitting
              ? "bg-emerald-600 text-white shadow-emerald-600/20 ring-emerald-700/30 hover:bg-emerald-700"
              : "bg-gray-200 text-gray-500 shadow-none ring-black/5 cursor-not-allowed",
          ].join(" ")}
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
        >
          {submitting ? "등록중..." : "등록"}
        </button>
      </div>
    </div>
  );
}
