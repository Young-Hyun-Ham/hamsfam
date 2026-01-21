// app/(sidebar-header)/admin/board/components/BoardListPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminBoardStore } from "../store";
import BoardUnlockModal from "./modal/BoardUnlockModal";
import { AdminBoardRow } from "../types";

function badge(category: string) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1";
  switch (category) {
    case "notice":
      return `${base} bg-indigo-50 text-indigo-700 ring-indigo-200`;
    case "faq":
      return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
    case "qna":
      return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    default:
      return `${base} bg-gray-50 text-gray-700 ring-gray-200`;
  }
}

export default function BoardListPanel({ items }: { items: AdminBoardRow[] }) {
  const { 
    paging,
    open,
  } = useAdminBoardStore();
  
  const [rows, setRows] = useState<AdminBoardRow[]>(items ?? []);
  const [openUnlock, setOpenUnlock] = useState<Boolean>(false);
  const [targetId, setTargetId] = useState<string>("");
  const [targetType, setTargetType] = useState<"detail" | "edit" | "delete" | null>(null);
  const empty = useMemo(() => rows.length === 0, [rows.length]);

  useEffect(() => {
    // console.log("================> ",items)
    setRows(items);
  }, [items]);

  function guardedOpen(args: { type: "detail" | "edit" | "delete"; id: string; hasPassword?: boolean }) {
    setTargetId(args.id);
    setTargetType(args.type);

    if (args.hasPassword) {
      setOpenUnlock(true);
    } else {
      setOpenUnlock(false);
    }
  }

  function onClose() {
    setOpenUnlock(false);
  }

  return (
    <div className="min-h-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-gray-600">
          총 <span className="font-semibold text-gray-900">{paging.total}</span>건
        </div>
      </div>

      <div className="px-4 pb-4">
        {empty ? (
          <div className="rounded-3xl bg-gray-50 p-10 text-center text-sm text-gray-500 ring-1 ring-black/5">
            데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div
                key={r.id ?? i}
                className="group rounded-3xl bg-white p-4 shadow-sm shadow-black/5 ring-1 ring-black/5
                           hover:shadow-lg hover:shadow-black/10 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div 
                      className="flex items-center gap-2"
                      onClick={() => {
                        r.hasPassword ? 
                          guardedOpen({type: "detail", id: r.id, hasPassword: true}) : 
                          open({ type: "detail", id: r.id })
                      }}
                    >
                      <span className={badge(r.slug)}>{r.slug}</span>
                      {r.hasPassword ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 ring-1 ring-black/5">
                          🔒 비밀글
                        </span>
                      ) : (
                        <div className="truncate small-text text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition">
                          {r.title}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>작성자: {r.authorName}</span>
                      <span className="text-gray-300">•</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                      {r.tags?.length ? (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="truncate">#{r.tags.join(" #")}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        r.hasPassword ? 
                          guardedOpen({type: "edit", id: r.id, hasPassword: true}) : 
                          open({ type: "edit", id: r.id })
                      }}
                      className="rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-700
                                 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 cursor-pointer"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => {
                        r.hasPassword ? 
                          guardedOpen({type: "delete", id: r.id, hasPassword: true}) : 
                          open({ type: "delete", id: r.id })
                      }}
                      className="rounded-full bg-rose-600 px-3 py-2 text-xs font-medium text-white
                                 shadow-sm shadow-rose-600/20 ring-1 ring-rose-700/30 hover:bg-rose-700 cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 비밀글 비번락 모달팝업 */}
      {openUnlock && (
        <BoardUnlockModal
          id={targetId}
          type={targetType}
          isOpen={openUnlock}
          onClose={onClose}
        />
      )}
    </div>
  );
}
