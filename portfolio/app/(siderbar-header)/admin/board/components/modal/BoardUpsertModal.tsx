"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store";
import { useAdminBoardStore } from "../../store";
import type { AdminBoardCategory } from "../../types";
import { ChevronDown } from "lucide-react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  editId?: string;
  onClose: () => void;
};

export default function BoardUpsertModal({ open, mode, editId, onClose }: Props) {
  const { user } = useStore();
  const getById = useAdminBoardStore((s) => s.getById);
  const createRow = useAdminBoardStore((s) => s.createRow);
  const updateRow = useAdminBoardStore((s) => s.updateRow);

  const [saving, setSaving] = useState(false);

  const editing = useMemo(
    () => (mode === "edit" && editId ? getById(editId) : undefined),
    [mode, editId, getById]
  );

  const [slug, setSlug] = useState<AdminBoardCategory>("qna");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  // ✅ 비밀번호 + 사용 여부 체크
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setSlug(editing.slug);
      setTitle(editing.title);
      setContent(editing.content);
      setTags((editing.tags ?? []).join(","));

      // ✅ 기존 글이 password(또는 hasPassword)가 있으면 체크 ON
      const hasPw = Boolean((editing as any).password) || Boolean((editing as any).hasPassword);
      setUsePassword(false);
      setPassword(""); // 수정 모드에서는 기본 비움(변경 시에만 입력)
    } else {
      setSlug("qna");
      setTitle("");
      setContent("");
      setTags("");

      setUsePassword(false);
      setPassword("");
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = async () => {
    if (saving) return;

    const tagArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const authorId = user.sub ?? user.uid ?? user.id;
    const authorName = user.name;

    // ✅ 체크된 경우에만 password 포함 (미입력은 저장 안 함)
    const pw = password.trim();
    const passwordPayload =
      usePassword && pw.length ? { password: pw } : { password: undefined };

    try {
      setSaving(true);
      if (mode === "create") {
        await Promise.resolve(
          createRow({
            slug,
            title,
            content,
            tags: tagArr,
            ...passwordPayload,
          })
        );
      } else if (mode === "edit" && editId) {
        await Promise.resolve(
          updateRow(editId, {
            slug,
            title,
            content,
            tags: tagArr,
            ...passwordPayload,
          })
        );
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl shadow-black/20 ring-1 ring-black/10 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {mode === "create" ? "글쓰기" : "글 수정"}
            </div>
            <div className="mt-1 text-xs text-gray-500">관리자 게시글 작성/수정 모달</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-700">카테고리</label>
                
                <div className="relative">
                  <select
                    value={slug}
                    onChange={(e) => setSlug(e.target.value as any)}
                    className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
                  >
                    <option value="notice">공지</option>
                    <option value="qna">QnA</option>
                    <option value="general">일반</option>
                  </select>

                  {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
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

            {/* ✅ NEW: 태그 아래 비밀번호 영역 */}
            <div className="rounded-3xl bg-gray-50 p-4 ring-1 ring-black/5 shadow-inner">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setUsePassword(next);
                      if (!next) setPassword("");
                    }}
                    className="h-4 w-4"
                  />
                  비밀번호 사용
                  <span className="text-xs text-gray-500">
                    {mode === "edit" ? "(변경 시에만 입력)" : "(보호글 설정)"}
                  </span>
                </label>

                <div className="text-xs text-gray-500">
                  체크하면 상세/수정/삭제 시 비밀번호 확인을 요구하도록 저장합니다.
                </div>
              </div>

              <div className="mt-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!usePassword}
                  placeholder="비밀번호를 입력하세요"
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-sm shadow-sm",
                    "focus:outline-none focus:ring-4",
                    usePassword
                      ? "border-gray-200 bg-white focus:border-emerald-400 focus:ring-emerald-100"
                      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed",
                  ].join(" ")}
                />
                {usePassword && !password.trim() ? (
                  <div className="mt-2 text-xs text-amber-600">
                    비밀번호 사용을 체크했다면 비밀번호를 입력해야 저장됩니다.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={submit}
              // 체크했는데 비번 비어있으면 저장 막기
              disabled={usePassword && !password.trim()}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-medium text-white ring-1",
                "shadow-lg shadow-emerald-600/20",
                usePassword && !password.trim()
                  ? "bg-emerald-300 ring-emerald-200 cursor-not-allowed"
                  : "bg-emerald-600 ring-emerald-700/30 hover:bg-emerald-700",
              ].join(" ")}
            >
              {saving ? "처리중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
