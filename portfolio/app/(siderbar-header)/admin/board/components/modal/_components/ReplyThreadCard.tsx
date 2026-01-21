// app/(sidebar-header)/admin/board/components/modal/_components/ReplyThreadCard.tsx
"use client";

import type { BoardReply, ReplyingTo } from "../../../types";
import { formatDate } from "@/lib/utils/utils";

type Props = {
  threadId: string;
  root: BoardReply;
  items: BoardReply[];

  isCollapsed: boolean;
  onToggleCollapse: (threadId: string) => void;

  setReplyingTo: (v: ReplyingTo) => void;

  // 권한/액션
  canManageReply: (r: BoardReply) => boolean;
  onStartEdit: (r: BoardReply) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (replyId: string) => void;
  onRemoveReply: (replyId: string) => void;

  // 편집 상태(단일 공유)
  editingId: string | null;
  editingText: string;
  onChangeEditingText: (v: string) => void;
  savingEdit: boolean;

  // meta
  directReplyCountById: Map<string, number>;
};

export function ReplyThreadCard({
  threadId,
  root,
  items,
  isCollapsed,
  onToggleCollapse,
  setReplyingTo,

  canManageReply,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onRemoveReply,

  editingId,
  editingText,
  onChangeEditingText,
  savingEdit,

  directReplyCountById,
}: Props) {
  const childCount = Math.max(0, items.length - 1);
  const rootCanManage = root && !root.deleted && canManageReply(root);

  const isRootEditing = editingId === root?.id;

  function indentPx(depth: number) {
    const d = Math.max(0, Math.min(depth ?? 0, 6));
    return d * 18;
  }

  return (
    <div key={threadId} className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
      {/* 스레드 헤더(루트 댓글 요약 + 접기/펼치기) */}
      <div className="border-b border-gray-100 px-5 py-4">
        {/* ✅ 1줄: 작성자/시간 (좌) + 답글뱃지+버튼 (우) */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{root?.authorName ?? "알수없음"}</span>
          <span className="text-[11px] text-gray-400">{formatDate(root?.createdAt)}</span>

          {/* ✅ 답글 뱃지 + 버튼들을 우측 묶음으로 */}
          <div className="ml-auto flex items-center gap-2">
            {childCount > 0 ? (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600 ring-1 ring-black/5">
                답글 {childCount}
              </span>
            ) : null}

            {/* ✅ 편집 중에는 우측 버튼을 유지해도 되지만, textarea 풀폭을 위해 아래로 내릴 거라 여기선 숨김 */}
            {!isRootEditing ? (
              <>
                <button
                  onClick={() => setReplyingTo({ id: String(root.id), authorName: root.authorName })}
                  className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                >
                  답글
                </button>

                {rootCanManage ? (
                  <>
                    <button
                      onClick={() => onStartEdit(root)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onRemoveReply(String(root.id))}
                      className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                    >
                      삭제
                    </button>
                  </>
                ) : null}

                <button
                  onClick={() => onToggleCollapse(threadId)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                >
                  {isCollapsed ? "펼치기" : "접기"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* ✅ 2줄: 본문/편집 영역 */}
        <div className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">
          {root?.deleted ? "삭제된 댓글입니다." : !isRootEditing ? root?.content : null}
        </div>

        {/* ✅ 3줄: depth=0 편집일 때는 textarea를 '풀폭'으로 (등록 textarea와 폭 동일) */}
        {root?.deleted ? null : isRootEditing ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={editingText}
              onChange={(e) => onChangeEditingText(e.target.value)}
              className="w-full min-h-[96px] rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                         focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            />

            {/* ✅ 편집일 때의 버튼들도 textarea 아래로 내려서 폭 방해 없게 */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onCancelEdit}
                className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                disabled={savingEdit}
              >
                취소
              </button>
              <button
                onClick={() => onSubmitEdit(String(root.id))}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm ring-1 ring-emerald-700/30 hover:bg-emerald-700 disabled:opacity-60"
                disabled={savingEdit || !editingText.trim()}
              >
                {savingEdit ? "저장중..." : "저장"}
              </button>
            </div>

            {/* ✅ 편집 상태에서도 답글 버튼은 유지 (지금은 보이지 않게 처리) */}
            {(1 == 1) ? null : (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setReplyingTo({ id: String(root.id), authorName: root.authorName })}
                  className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                >
                  답글
                </button>

                {rootCanManage ? (
                  <button
                    onClick={() => onRemoveReply(String(root.id))}
                    className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                  >
                    삭제
                  </button>
                ) : null}

                <button
                  onClick={() => onToggleCollapse(threadId)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                >
                  {isCollapsed ? "펼치기" : "접기"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 스레드 바디(자식 댓글들) */}
      {!isCollapsed ? (
        <div className="px-3 py-3">
          <div className="space-y-2">
            {items.length == 1 ? (
              <div className="bg-gray-50/50 px-2 text-xs text-gray-500">답글이 없습니다.</div>
            ) : (
              <>
                {items
                  .filter((x) => x.id !== root?.id) // 루트 제외
                  .map((r) => {
                    const canReply = (r.depth ?? 0) < 3 && !r.deleted; // ✅ depth 3이면 답글 금지
                    const indent = indentPx(r.depth ?? 0);

                    const canManage = !r.deleted && canManageReply(r);
                    const isEditing = editingId === r.id;

                    return (
                      <div key={r.id} style={{ paddingLeft: indent }}>
                        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{r.authorName}</span>
                                <span className="text-[11px] text-gray-400">{formatDate(r.createdAt)}</span>
                                <span className="rounded-full bg-gray-100 px-2 text-[11px] text-gray-600 ring-1 ring-black/5">
                                  depth {r.depth}
                                </span>
                              </div>

                              <div className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">
                                {r.deleted ? (
                                  "삭제된 댓글입니다."
                                ) : isEditing ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingText}
                                      onChange={(e) => onChangeEditingText(e.target.value)}
                                      className="w-full min-h-[88px] rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm
                                                focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={onCancelEdit}
                                        className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                                        disabled={savingEdit}
                                      >
                                        취소
                                      </button>
                                      <button
                                        onClick={() => onSubmitEdit(String(r.id))}
                                        className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm ring-1 ring-indigo-700/30 hover:bg-indigo-700 disabled:opacity-60"
                                        disabled={savingEdit || !editingText.trim()}
                                      >
                                        {savingEdit ? "저장중..." : "저장"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  r.content
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                onClick={() =>
                                  canReply ? 
                                    setReplyingTo({
                                      id: String(r.id),
                                      authorName: r.authorName,
                                      preview: r.content?.slice(0, 60),
                                      depth: r.depth,
                                    }) : undefined
                                }
                                disabled={!canReply}
                                className={[
                                  "rounded-full px-3 py-1.5 text-xs shadow-sm ring-1 transition",
                                  canReply ? "bg-white ring-black/5 hover:bg-gray-50" : "bg-gray-100 text-gray-400 ring-black/5 cursor-not-allowed",
                                ].join(" ")}
                                title={!canReply ? "depth 3까지 답글 가능" : "답글 달기"}
                              >
                                답글
                              </button>

                              {canManage ? (
                                <>
                                  <button
                                    onClick={() => onStartEdit(r)}
                                    className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => onRemoveReply(String(r.id))}
                                    className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                                  >
                                    삭제
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {/* meta */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                            {canReply ? (
                              <span className="rounded-full bg-gray-50 px-2 ring-1 ring-black/5">
                                replyCount: {directReplyCountById.get(String(r.id)) ?? 0}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-gray-50 px-2 ring-1 ring-black/5">
                              path: {r.path}
                            </span>
                          </div>
                              
                        </div>
                      </div>
                    );
                  })
                }
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {items.length == 1 ? (
            <div className="bg-gray-50/50 px-5 py-3 text-xs text-gray-500">답글이 없습니다.</div>
          ) : (
            <div className="bg-gray-50/50 px-5 py-3 text-xs text-gray-500">답글 내용이 접혀있습니다.</div>
          )}
        </>
      )}
    </div>
  );
}
