"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  projectId: string;
  projectName?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (projectId: string) => void | Promise<void>;
};

export default function ConfirmDeleteProjectModal({
  open,
  projectId,
  projectName,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const isMatch = useMemo(
    () => typed.trim() === projectId.trim(),
    [typed, projectId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                프로젝트 삭제 (강력 경고)
              </div>
              <div className="mt-1 text-xs text-gray-500">
                삭제된 프로젝트는 복구할 수 없습니다. 연결된 인텐트/엔티티도 함께
                삭제될 수 있습니다.
              </div>
            </div>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              onClick={onClose}
              disabled={loading}
            >
              닫기
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <div className="text-xs font-semibold text-red-700">
              정말 삭제하려면 아래에 프로젝트 ID를 정확히 입력하세요.
            </div>
            <div className="mt-1 text-[11px] text-red-700/80">
              대상: <span className="font-mono">{projectId}</span>
              {projectName ? (
                <>
                  {" "}
                  / <span className="font-semibold">{projectName}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-gray-700">
              프로젝트 ID 입력
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
              placeholder={projectId}
              autoFocus
              disabled={loading}
            />
            <div className="text-[11px] text-gray-500">
              입력값이 일치해야 삭제 버튼이 활성화됩니다.
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={loading}
          >
            취소
          </button>

          <button
            type="button"
            className={`rounded-md px-3 py-2 text-xs font-semibold text-white ${
              isMatch && !loading
                ? "bg-red-600 hover:bg-red-700"
                : "bg-red-300 cursor-not-allowed"
            }`}
            disabled={!isMatch || loading}
            onClick={() => onConfirm(projectId)}
          >
            {loading ? "삭제중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
