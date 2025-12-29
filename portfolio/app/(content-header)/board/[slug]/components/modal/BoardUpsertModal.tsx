// app/(content-header)/board/[slug]/components/modal/BoardUpsertModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import usePublicBoardStore from "../../store";

function parseTags(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,#\n]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .flatMap((s) => s.split(/\s+/g).map((x) => x.trim()).filter(Boolean))
    )
  ).slice(0, 20);
}

export default function BoardUpsertModal() {
  const {
    upsertOpen,
    closeUpsert,
    createPost,
    updatePost,
    items,
    selectedId,
    saving,
  } = usePublicBoardStore() as any;

  const editing = useMemo(
    () => items.find((it: any) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // ✅ NEW
  const [tagsText, setTagsText] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!upsertOpen) return;

    if (editing) {
      setTitle(editing.title ?? "");
      setContent(editing.content ?? "");
      setTagsText((editing.tags ?? []).join(", "));
      setPassword("");
    } else {
      setTitle("");
      setContent("");
      setTagsText("");
      setPassword("");
    }
  }, [upsertOpen, editing]);

  if (!upsertOpen) return null;

  async function submit() {
    const t = title.trim();
    const c = content.trim();
    if (!t) return;

    const tags = parseTags(tagsText);
    const pw = password.trim();

    if (editing) {
      await updatePost(editing.id, {
        title: t,
        content: c,
        tags,
        password: Boolean(pw.length) ? pw : undefined,
        hasPassword: Boolean(pw.length),
      });
    } else {
      await createPost({
        title: t,
        content: c,
        tags,
        password: Boolean(pw.length) ? pw : undefined,
        hasPassword: Boolean(pw.length),
      });
    }
    closeUpsert();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeUpsert();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl">
        <div className="rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.20)] ring-1 ring-black/5">
          <div className="flex items-start justify-between px-6 pb-4 pt-5">
            <div>
              <div className="text-base font-semibold text-gray-900">
                {editing ? "게시글 수정" : "게시글 작성"}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                제목/내용/태그를 입력하고 저장하세요. 비밀번호를 넣으면 보호글이 됩니다.
              </div>
            </div>

            <button
              onClick={closeUpsert}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:bg-gray-200"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <div className="px-6 pb-6">
            {/* 모달 컨테이너에 “숨김 더미 필드” 추가 (크롬/사파리 강력 차단) */}
            <div className="hidden">
              <input type="text" name="fake-user" autoComplete="username" />
              <input type="password" name="fake-pass" autoComplete="current-password" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">제목</div>
                <input
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-black/5 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-black/10"
                  placeholder="제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={Boolean(saving)}
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">내용</div>
                <textarea
                  className="h-44 w-full resize-none rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-900 outline-none ring-1 ring-black/5 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-black/10"
                  placeholder="내용을 입력하세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={Boolean(saving)}
                />
              </div>

              {/* tags */}
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">태그</div>
                <input
                  id="board-tags"
                  name="board-tags"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-black/5 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-black/10"
                  placeholder="예) 공지, 업데이트, 장애 (쉼표/공백/엔터로 구분)"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  disabled={Boolean(saving)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parseTags(tagsText).map((t) => (
                    <span
                      key={t}
                      className="rounded-2xl bg-gray-100 px-3 py-1 text-[11px] text-gray-700 shadow-sm ring-1 ring-black/5"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* password */}
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">
                  비밀번호 {editing ? "(변경 시에만 입력)" : "(보호글 설정)"}
                </div>
                <input
                  id="board-password"
                  name="board-password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-black/5 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-black/10"
                  placeholder="비밀번호를 입력하면 상세/수정/삭제가 잠깁니다"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={Boolean(saving)}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>{title.trim().length ? `${title.trim().length}자` : ""}</span>
                <span>{content.trim().length ? `${content.trim().length}자` : ""}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 pb-6">
            <button
              onClick={closeUpsert}
              disabled={Boolean(saving)}
              className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={Boolean(saving) || !title.trim()}
              className="rounded-2xl bg-black px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
