// app/(sidebar-header)/admin/board/components/modal/BoardUpsertModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminBoardStore } from "../../store";
import type { AdminBoardCategory } from "../../types";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  editId?: string;
  onClose: () => void;
};

export default function BoardUpsertModal({ open, mode, editId, onClose }: Props) {
  const getById = useAdminBoardStore((s) => s.getById);
  const createRow = useAdminBoardStore((s) => s.createRow);
  const updateRow = useAdminBoardStore((s) => s.updateRow);

  const editing = useMemo(() => (mode === "edit" && editId ? getById(editId) : undefined), [mode, editId, getById]);

  const [category, setCategory] = useState<AdminBoardCategory>("qna");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isSecret, setIsSecret] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCategory(editing.category);
      setTitle(editing.title);
      setContent(editing.content);
      setTags((editing.tags ?? []).join(","));
      setIsSecret(!!editing.isSecret);
    } else {
      setCategory("qna");
      setTitle("");
      setContent("");
      setTags("");
      setIsSecret(false);
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = () => {
    const tagArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (mode === "create") {
      createRow({ category, title, content, tags: tagArr, isSecret });
    } else if (mode === "edit" && editId) {
      updateRow(editId, { category, title, content, tags: tagArr, isSecret });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl shadow-black/20 ring-1 ring-black/10 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">{mode === "create" ? "글쓰기" : "글 수정"}</div>
            <div className="mt-1 text-xs text-gray-500">관리자 게시글 작성/수정 모달 (퍼블리싱)</div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:bg-gray-50">
            닫기
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-700">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                             focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="notice">공지</option>
                  <option value="faq">FAQ</option>
                  <option value="qna">QnA</option>
                  <option value="general">일반</option>
                </select>
              </div>

              <div className="flex items-end justify-between gap-3">
                <label className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
                  <input
                    type="checkbox"
                    checked={isSecret}
                    onChange={(e) => setIsSecret(e.target.checked)}
                    className="h-4 w-4"
                  />
                  비밀글
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                           focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                className="mt-1 w-full min-h-[180px] rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                           focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">태그 (쉼표로 구분)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="예: qna, urgent"
                className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                           focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:bg-gray-50">
              취소
            </button>
            <button
              onClick={submit}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white
                         shadow-lg shadow-emerald-600/20 ring-1 ring-emerald-700/30 hover:bg-emerald-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
