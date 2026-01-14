// app/(sidebar-header)/admin/board/components/modal/BoardDetailModal.tsx
"use client";

import { useMemo } from "react";
import { useAdminBoardStore } from "../../store";

type Props = {
  open: boolean;
  id: string;
  onClose: () => void;
};

export default function BoardDetailModal({ open, id, onClose }: Props) {
  const getById = useAdminBoardStore((s) => s.getById);
  const openModal = useAdminBoardStore((s) => s.open);

  const row = useMemo(() => (open && id ? getById(id) : undefined), [open, id, getById]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl shadow-black/20 ring-1 ring-black/10 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">상세 보기</div>
            <div className="mt-1 text-xs text-gray-500">게시글 상세 모달 (퍼블리싱)</div>
          </div>
          <div className="flex items-center gap-2">
            {row ? (
              <>
                <button
                  onClick={() => openModal({ type: "edit", id: row.id })}
                  className="rounded-full bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  onClick={() => openModal({ type: "delete", id: row.id })}
                  className="rounded-full bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-rose-700/30 hover:bg-rose-700"
                >
                  삭제
                </button>
              </>
            ) : null}
            <button onClick={onClose} className="rounded-full bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:bg-gray-50">
              닫기
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-auto px-6 py-5">
          {!row ? (
            <div className="rounded-3xl bg-gray-50 p-10 text-center text-sm text-gray-500 ring-1 ring-black/5">
              데이터를 찾을 수 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="text-xs text-gray-500">ID</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{row.id}</div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-gray-500">카테고리</div>
                    <div className="mt-1 text-sm text-gray-900">{row.category}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">작성자</div>
                    <div className="mt-1 text-sm text-gray-900">{row.authorName}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-gray-500">제목</div>
                  <div className="mt-1 text-base font-semibold text-gray-900 whitespace-pre-wrap break-words">{row.title}</div>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-gray-500">내용</div>
                  <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">{row.content}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(row.tags ?? []).map((t) => (
                    <span key={t} className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-700 ring-1 ring-black/5">
                      #{t}
                    </span>
                  ))}
                  {row.isSecret ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 ring-1 ring-black/5">🔒 비밀글</span>
                  ) : null}
                </div>

                <div className="mt-5 text-xs text-gray-500">
                  createdAt: {new Date(row.createdAt).toLocaleString()} / updatedAt:{" "}
                  {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}
                </div>
              </div>

              {/* 댓글 영역(퍼블리싱만) */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">댓글</div>
                    <div className="mt-1 text-xs text-gray-500">퍼블리싱용 UI</div>
                  </div>
                  <button className="rounded-full bg-white px-3 py-2 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50">
                    새로고침
                  </button>
                </div>
                <div className="p-5">
                  <textarea
                    className="w-full min-h-[96px] rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                               focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    placeholder="댓글을 입력하세요"
                  />
                  <div className="mt-3 flex justify-end">
                    <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 ring-1 ring-emerald-700/30 hover:bg-emerald-700">
                      등록
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
