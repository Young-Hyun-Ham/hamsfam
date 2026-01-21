// app/(content-header)/board/[slug]/components/BoardDetailPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import usePublicBoardStore from "../store";
import type { BoardPost } from "../types";
import { formatDate } from "@/lib/utils/utils";

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
    
    verifyPostPassword,
  } = usePublicBoardStore() as any;

  const [replyText, setReplyText] = useState("");

  // 보호글 잠금해제 상태
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  // 언락 상태를 컴포넌트에서만 관리 (글 바뀌면 무조건 다시 잠김)
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

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
    setUnlocked(false);
    setReplyText("");
    setPw("");
    setPwError(null);
  }, [postId, fetchReplies]);

  // locked 계산도 훅 이후에(하지만 return 이전이라 OK)
  const locked = Boolean(selected?.hasPassword) && !unlocked;
  const canReplyFinal = canReply && !locked;
  // 권한 (현재 리스트에서 edit 권한을 글쓰기 기준으로 쓰고 있어서 동일하게)
  const canEdit = Boolean(category?.edit) && !locked;
  // 삭제한 댓글 표시 토글 변수
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    if (!postId) return;
    fetchReplies(postId);
    setUnlocked(false);
    setReplyText("");
    setPw("");
    setPwError(null);

    // ✅ 글이 바뀌면 기본은 숨김
    setShowDeleted(false);
  }, [postId, fetchReplies]);

  async function unlock() {
    const pwTrim = pw.trim();
    if (!postId || !pwTrim) return;

    setPwError(null);
    setUnlocking(true);
    try {
      const ok = await verifyPostPassword?.(postId, pwTrim);
      if (!ok) {
        setPwError("비밀번호가 올바르지 않습니다.");
        setUnlocked(false);
      } else {
        setUnlocked(true);
        setPw("");
        setPwError(null);
      }
    } finally {
      setUnlocking(false);
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
            onClick={() => {
              setUnlocked(false);
              setPw("");
              setPwError(null);
              closeDetail();
            }}
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
                createdAt: {formatDate(selected.createdAt) ?? "-"} / updatedAt: {formatDate(selected.updatedAt) ?? "-"}
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

                <div className="flex items-center gap-2">
                  {/* 삭제 댓글 토글 */}
                  <button
                    type="button"
                    onClick={() => setShowDeleted((v) => !v)}
                    className={[
                      "rounded-2xl px-4 py-2 text-xs shadow-sm ring-1 transition",
                      showDeleted
                        ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                        : "bg-gray-100 text-gray-700 ring-black/5 hover:bg-gray-200",
                    ].join(" ")}
                    title="삭제된 댓글 표시/숨김"
                  >
                    {showDeleted ? "삭제 댓글 숨김" : "삭제 댓글 표시"}
                  </button>

                  {/* 새로고침 */}
                  <button
                    onClick={() => postId && fetchReplies(postId)}
                    className="rounded-2xl bg-gray-100 px-4 py-2 text-xs text-gray-700 shadow-sm hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={repliesLoading || !postId}
                  >
                    {repliesLoading ? "불러오는 중..." : "새로고침"}
                  </button>
                </div>
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
                  (() => {
                    // ✅ depth 기반 indent (최대 3단까지만 시각적으로)
                    const INDENT_UNIT = 18; // px
                    const MAX_DEPTH_UI = 3;

                    const getDepth = (r: any) => {
                      const d = Number(r.depth ?? 0);
                      return Number.isFinite(d) ? d : 0;
                    };

                    const depthLabel = (d: number) => {
                      if (d <= 0) return "댓글";
                      if (d === 1) return "답글";
                      // return `답글 · ${d}단`;
                      return `답글`;
                    };

                    // ✅ path/threadId가 없을 때도 정렬이 안정적으로 되게 fallback
                    const sortKey = (r: any) => {
                      const d = getDepth(r);
                      const path = (r.path ?? "").toString();
                      const threadId = (r.threadId ?? "").toString();
                      const createdAt = (r.createdAt ?? "").toString();
                      // path가 있으면 path 우선(관리자와 동일한 개념)
                      if (path) return `${path}__${String(d).padStart(2, "0")}__${createdAt}`;
                      // threadId가 있으면 threadId 우선
                      if (threadId) return `${threadId}__${String(d).padStart(2, "0")}__${createdAt}`;
                      // 둘 다 없으면 createdAt로만
                      return `zz__${String(d).padStart(2, "0")}__${createdAt}`;
                    };

                    const sorted = [...replies].sort((a: any, b: any) =>
                      sortKey(a).localeCompare(sortKey(b))
                    );

                    const chipCls = (d: number) => {
                      const base =
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 shadow-sm";
                      if (d <= 0) return `${base} bg-indigo-50 text-indigo-700 ring-indigo-200`;
                      if (d === 1) return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
                      return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
                    };

                    function getParentContent(
                      parentId: string | null | undefined,
                      replies: any[],
                      maxLen: number = 20
                    ) {
                      if (!parentId) return null;
                      const parent = replies.find((r) => r.id === parentId);
                      if (!parent || !parent.content) return null;

                      const text = parent.content.replace(/\s+/g, " ").trim();
                      return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
                    }
                    
                    const visible = showDeleted ? sorted : sorted.filter((r: any) => !r.deleted);
                    return visible.map((r: any) => {
                      const isDeleted = Boolean(r.deleted);
                      const d = getDepth(r);
                      const uiDepth = Math.min(d, MAX_DEPTH_UI);
                      const ml = uiDepth * INDENT_UNIT;

                      return (
                        <div key={r.id} className="relative">
                          {/* ✅ depth 가이드 라인 (부드럽게) */}
                          {uiDepth > 0 ? (
                            <div
                              className="pointer-events-none absolute left-0 top-0 h-full"
                              style={{ width: ml }}
                            >
                              <div className="h-full w-full rounded-2xl bg-gradient-to-b from-black/5 to-transparent" />
                            </div>
                          ) : null}

                          <div style={{ marginLeft: ml }}>
                            <div
                              className={[
                                "rounded-3xl p-4 ring-1 ring-black/5",
                                isDeleted
                                  ? "bg-gray-50 shadow-inner"
                                  : "bg-white shadow-[0_10px_28px_rgba(0,0,0,0.08)]",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  {/* ✅ 상단 메타: depth 칩 + 작성자/시간 */}
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className={chipCls(d)}>{depthLabel(d)}</span>

                                    {r.parentId ? (
                                      <span className="text-[11px] text-gray-400">
                                        ↳ “{getParentContent(r.parentId, replies) ?? "삭제된 글입니다."}”
                                      </span>
                                    ) : null}
                                  </div>

                                  <div
                                    className={[
                                      "whitespace-pre-wrap text-sm leading-6",
                                      isDeleted ? "text-gray-400 italic" : "text-gray-900",
                                    ].join(" ")}
                                  >
                                    {isDeleted ? "삭제된 글입니다." : r.content}
                                  </div>

                                  <div className="mt-2 text-[11px] text-gray-400">
                                    {r.authorName ? `작성자: ${r.authorName} · ` : ""}
                                    {formatDate(r.createdAt) ?? "-"}
                                  </div>
                                </div>

                                {/* 삭제된 댓글이면 버튼 숨김 */}
                                {!isDeleted ? (
                                  <button
                                    onClick={() => onDeleteReply(r.id)}
                                    disabled={repliesSaving}
                                    className="shrink-0 rounded-2xl bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="삭제"
                                  >
                                    삭제
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
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
