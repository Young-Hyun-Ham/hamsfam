// app/(sidebar-header)/admin/board/components/modal/BoardUnlockModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminBoardStore } from "../../store";
import { api } from "@/lib/axios";

type NextAction = { type: "detail" | "edit" | "delete"; id: string } | null;

type Props = {
  isOpen: Boolean;
  id: string;
  type: "detail" | "edit" | "delete" | null;
  onClose: () => void;
};
export default function BoardUnlockModal({ isOpen, id, type, onClose }: Props) {
  if (!isOpen) return null;

  const [unlockOpen, setUnlockOpen] = useState<Boolean>(false);
  const [unlockTarget, setUnlockTarget] = useState<{ type: "detail" | "edit" | "delete"; id: string } | null>(null);
  const open = useAdminBoardStore((s) => s.open);

  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const target: NextAction = useMemo(() => unlockTarget ?? null, [unlockTarget]);

  useEffect(() => {
    if (!unlockOpen) {
      setPw("");
      setErr(null);
      setLoading(false);
    }
  }, [unlockOpen]);

  // if (!unlockOpen || !target) return null;

  async function confirm() {
    const password = pw.trim();
    if (!password) return;

    try {
      setLoading(true);
      setErr(null);

      const payload = {
        id,
        password,
      };
      const { data } = await api.post("/api/admin/firebase/board/verify", payload);
      console.log("비밀번호 인증 ====> ", data.ok);
      // const ok = await verifyPostPassword(target.id, password);
      if (!data) {
        setErr("비밀번호가 올바르지 않습니다.");
        return;
      }

      onClose();
      open({ type, id, });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)] ring-1 ring-black/5 overflow-hidden">
          <div className="flex items-start justify-between px-6 pb-4 pt-5">
            <div>
              <div className="text-base font-semibold text-gray-900">🔒 비밀글 확인</div>
              <div className="mt-1 text-xs text-gray-500">
                비밀번호를 입력해야 상세/수정/삭제가 가능합니다.
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:bg-gray-200"
              aria-label="닫기"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 shadow-inner">
              <div className="text-xs font-medium text-gray-700">비밀번호</div>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="비밀번호 입력"
                className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 outline-none
                           ring-1 ring-black/5 placeholder:text-gray-400 focus:ring-2 focus:ring-black/10"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirm();
                }}
              />

              {err ? <div className="mt-2 text-xs text-rose-600">{err}</div> : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 pb-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-700
                         hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              onClick={confirm}
              disabled={loading || !pw.trim()}
              className="rounded-2xl bg-black px-5 py-2 text-sm font-medium text-white shadow-sm
                         hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "확인 중..." : "확인"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
