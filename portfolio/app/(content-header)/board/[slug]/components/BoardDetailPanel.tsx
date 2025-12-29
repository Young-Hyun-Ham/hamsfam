// app/(content-header)/board/[slug]/components/BoardDetailPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import usePublicBoardStore from "../store";
import type { BoardPost } from "../types";

export default function BoardDetailPanel({ selected }: { selected: BoardPost | null }) {
  const {
    closeDetail,
    category,

    repliesByPostId,
    repliesLoading,
    repliesSaving,
    fetchReplies,
    createReply,
    deleteReply,
    
    openEdit,
    openDelete,
    // 추가된 store api (없으면 undefined여도 OK)
    isPostUnlocked,
    verifyPostPassword,
  } = usePublicBoardStore() as any;

  const [replyText, setReplyText] = useState("");

  // 보호글 잠금해제 상태
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const postId = selected?.id ?? "";

  const replies = useMemo(() => {
    if (!postId) return [];
    return repliesByPostId[postId] ?? [];
  }, [postId, repliesByPostId]);

  const canReply = Boolean(category?.reply);

  // selected가 바뀔 때만 댓글 로드
  useEffect(() => {
    if (!postId) return;
    fetchReplies(postId);
    setReplyText("");
    setPw("");
    setPwError(null);
  }, [postId, fetchReplies]);

  // locked 계산도 훅 이후에(하지만 return 이전이라 OK)
  const locked = Boolean(selected?.hasPassword) && !(isPostUnlocked?.(postId) ?? false);
  const canReplyFinal = canReply && !locked;
  // 권한 (현재 리스트에서 edit 권한을 글쓰기 기준으로 쓰고 있어서 동일하게)
  const canEdit = Boolean(category?.edit) && !locked;

  async function unlock() {
    setPwError(null);
    const ok = await verifyPostPassword?.(postId, pw);
    if (!ok) setPwError("비밀번호가 올바르지 않습니다.");
    else {
      setPw("");
      setPwError(null);
    }
  }

  const onSubmitReply = async () => {
    if (!postId) return;
    const text = replyText.trim();
    if (!text) return;

    const id = await createReply(postId, text);
    if (id) setReplyText("");
  };

  const onDeleteReply = async (replyId: string) => {
    if (!postId) return;
    await deleteReply(replyId, postId);
  };

  // ✅ 여기서 early return 해도 "훅은 이미 위에서 전부 호출" 되었기 때문에 안전
  if (!selected) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div>
          <div className="text-sm font-semibold text-gray-900">상세</div>
          <div className="mt-1 text-xs text-gray-500">
            {category?.name ? `카테고리: ${category.name}` : "읽기 전용"}
          </div>
        </div>

        {/* 액션 버튼 영역 추가 */}
        <div className="flex items-center gap-2">
          {canEdit ? (
            <>
              <button
                onClick={() => openEdit?.(selected.id)}
                className="rounded-2xl bg-white px-4 py-2 text-xs font-medium text-gray-800
                           shadow-[0_10px_28px_rgba(0,0,0,0.10)] ring-1 ring-black/5
                           hover:bg-gray-50 hover:shadow-[0_14px_36px_rgba(0,0,0,0.14)]
                           active:scale-[0.98]"
              >
                수정
              </button>

              <button
                onClick={() => openDelete?.(selected.id)}
                className="rounded-2xl bg-red-600 px-4 py-2 text-xs font-medium text-white
                           shadow-[0_10px_28px_rgba(0,0,0,0.12)]
                           hover:bg-red-700 active:scale-[0.98]"
              >
                삭제
              </button>
            </>
          ) : null}

          <button
            onClick={closeDetail}
            className="rounded-2xl bg-gray-100 px-4 py-2 text-xs text-gray-700 shadow-sm hover:bg-gray-200"
          >
            닫기
          </button>
        </div>
      </div>

      {/* body */}
      {locked ? (
        <div className="mt-2 rounded-3xl bg-gray-50 p-4 ring-1 ring-black/5 shadow-inner">
          <div className="text-sm font-semibold text-gray-900">🔒 보호글입니다</div>
          <div className="mt-1 text-xs text-gray-500">
            비밀번호를 입력해야 상세/수정/삭제가 가능합니다.
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호"
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-black/10"
            />
            <button
              onClick={unlock}
              className="rounded-2xl bg-black px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
              disabled={!pw.trim()}
            >
              잠금해제
            </button>
          </div>

          {pwError ? <div className="mt-2 text-xs text-red-600">{pwError}</div> : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-5 pb-6">
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
              <div className="text-[11px] text-gray-400">작성자: {selected.authorName ?? "-"}</div>
              <div className="text-[11px] font-medium text-gray-500 py-2">TITLE</div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner ring-1 ring-black/5">
                {selected.title}
              </div>

              <div className="text-[11px] font-medium text-gray-500 py-2">CONTENT</div>
              <div className="whitespace-pre-wrap rounded-2xl bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-900 ring-1 ring-black/5">
                {selected.content}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.tags?.length ? (
                  selected.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-2xl bg-gray-100 px-3 py-1 text-[11px] text-gray-700 shadow-sm ring-1 ring-black/5"
                    >
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>

              <div className="mt-4 text-[11px] text-gray-400">
                createdAt: {selected.createdAt ?? "-"} / updatedAt: {selected.updatedAt ?? "-"}
              </div>
            </section>

            <div className="h-3" />

            {/* Replies wrapper card */}
            <section className="rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">댓글</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {canReplyFinal
                      ? "댓글 작성 가능"
                      : locked
                        ? "보호글은 비밀번호 확인 후 댓글 작성 가능합니다."
                        : "이 게시판은 댓글 권한이 없습니다."}
                  </div>
                </div>

                <button
                  onClick={() => postId && fetchReplies(postId)}
                  className="rounded-2xl bg-gray-100 px-4 py-2 text-xs text-gray-700 shadow-sm hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={repliesLoading || !postId}
                >
                  {repliesLoading ? "불러오는 중..." : "새로고침"}
                </button>
              </div>

              {/* reply editor card */}
              <div className="mt-4 rounded-3xl bg-gray-50 p-4 shadow-inner ring-1 ring-black/5">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    locked
                      ? "보호글은 비밀번호 확인 후 댓글 작성 가능합니다"
                      : canReply
                        ? "댓글을 입력하세요"
                        : "댓글 작성 권한이 없습니다"
                  }
                  disabled={!canReplyFinal || repliesSaving}
                  rows={3}
                  className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-black/5 placeholder:text-gray-400 focus:ring-2 focus:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-gray-400">
                    {replyText.trim().length ? `${replyText.trim().length}자` : ""}
                  </div>

                  <button
                    onClick={onSubmitReply}
                    disabled={!canReplyFinal || repliesSaving || !replyText.trim()}
                    className="rounded-2xl bg-black px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {repliesSaving ? "등록 중..." : "댓글 등록"}
                  </button>
                </div>
              </div>

              {/* replies list */}
              <div className="mt-4 space-y-3">
                {repliesLoading ? (
                  <div className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-500 shadow-inner ring-1 ring-black/5">
                    댓글을 불러오는 중...
                  </div>
                ) : replies.length ? (
                  replies.map((r: any) => (
                    <div
                      key={r.id}
                      className="rounded-3xl bg-white p-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="whitespace-pre-wrap text-sm leading-6 text-gray-900">
                            {r.content}
                          </div>
                          <div className="mt-2 text-[11px] text-gray-400">
                            {r.authorName ? `작성자: ${r.authorName} · ` : ""}
                            {r.createdAt ?? "-"}
                          </div>
                        </div>

                        <button
                          onClick={() => onDeleteReply(r.id)}
                          disabled={repliesSaving}
                          className="shrink-0 rounded-2xl bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title="삭제"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-500 shadow-inner ring-1 ring-black/5">
                    아직 댓글이 없습니다.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
