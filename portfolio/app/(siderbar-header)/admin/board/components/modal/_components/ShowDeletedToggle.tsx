// app/(sidebar-header)/admin/board/components/modal/_components/ShowDeletedToggle.tsx
"use client";

type Props = {
  showDeleted: boolean;
  onToggle: () => void;
};

export function ShowDeletedToggle({ showDeleted, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "group inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs shadow-sm ring-1 transition",
        "bg-white ring-black/5 hover:bg-gray-50",
      ].join(" ")}
      title="삭제된 댓글 표시 여부"
    >
      <span className="text-gray-600">삭제 댓글</span>

      <span
        className={[
          "relative inline-flex h-5 w-9 items-center rounded-full ring-1 transition",
          showDeleted ? "bg-emerald-600 ring-emerald-700/30" : "bg-gray-200 ring-black/10",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
            showDeleted ? "translate-x-4" : "translate-x-1",
          ].join(" ")}
        />
      </span>

      <span className={showDeleted ? "text-emerald-700" : "text-gray-500"}>
        {showDeleted ? "표시" : "숨김"}
      </span>
    </button>
  );
}
