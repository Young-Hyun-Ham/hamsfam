"use client";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({
  open,
  title = "삭제하시겠습니까?",
  description = "이 작업은 되돌릴 수 없습니다.",
  confirmText = "삭제",
  cancelText = "취소",
  loading,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "처리중..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
