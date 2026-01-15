// app/(siderbar-header)/admin/train/components/modal/ConfirmTrainModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrainPreviewItem } from "../../types";
import { formatDate } from "@/lib/utils/utils"

type TargetType = "project" | "intent" | "entity";

type Props = {
  open: boolean;
  targetType: TargetType;
  projectId: string;
  projectName: string;
  // needsEmbedding 카운트 표시용
  intentNeedCount?: number;
  entityNeedCount?: number;

  onClose: () => void;
  onConfirm: (selectedIds?: string[]) => Promise<void> | void;
};

export default function ConfirmTrainModal({
  open,
  targetType,
  projectId,
  projectName,
  intentNeedCount,
  entityNeedCount,
  onClose,
  onConfirm,
}: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [doubleCheck, setDoubleCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 프리뷰 목록 상태
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [items, setItems] = useState<TrainPreviewItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isFullTrain = targetType === "project";
  const isPickable = targetType === "intent" || targetType === "entity";

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setDoubleCheck(false);
      setSubmitting(false);
      setPreviewLoading(false);
      setPreviewError(null);
      setItems([]);
      setSelectedIds([]);
    }

    // intent/entity 모달 열릴 때 프리뷰 조회
    if (isPickable) {
      (async () => {
        try {
          setPreviewLoading(true);
          setPreviewError(null);

          const res = await fetch(
            `/api/admin/firebase/train/preview?projectId=${encodeURIComponent(projectId)}&targetType=${targetType}&onlyNeeds=true&limit=200`
          );
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();

          const list: TrainPreviewItem[] = Array.isArray(data?.items) ? data.items : [];
          setItems(list);
          // 기본은 전체 선택(=needsEmbedding true 전체)
          setSelectedIds(list.map((x) => x.id));
        } catch (e: any) {
          setPreviewError(e?.message ?? "대상 조회 실패");
        } finally {
          setPreviewLoading(false);
        }
      })();
    }
  }, [open, isPickable, projectId, targetType]);
  
  const title = useMemo(() => {
    if (targetType === "project") return "⚠️ 전체 지식 재학습";
    if (targetType === "intent") return "최근 수정 인텐트 학습";
    return "최근 수정 엔티티 학습";
  }, [targetType]);

  const desc = useMemo(() => {
    if (targetType === "project") {
      return "프로젝트 전체 지식을 다시 임베딩(학습)합니다. 데이터 양에 따라 비용/시간이 증가할 수 있습니다.";
    }
    if (targetType === "intent") {
      return "needsEmbedding=true 인텐트만 배치 학습합니다.";
    }
    return "needsEmbedding=true 엔티티만 배치 학습합니다.";
  }, [targetType]);

  const confirmEnabled = useMemo(() => {
    if (!isFullTrain) {
      // intent/entity는 선택 1개 이상이어야 실행되게
      return selectedIds.length > 0 && !previewLoading && !previewError;
    }
    return confirmText.trim() === projectId && doubleCheck;
  }, [isFullTrain, confirmText, projectId, doubleCheck, selectedIds.length, previewLoading, previewError]);

  const toggleAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map((x) => x.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        // 오버레이 자체를 눌렀을 때만 닫기 (내부 클릭은 아래에서 막힘)
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="border-b px-5 py-4">
          <div className="text-sm font-bold text-gray-900">{title}</div>
          <div className="mt-1 text-[12px] text-gray-600">{desc}</div>
        </div>

        {/* body */}
        <div className="px-5 py-4 space-y-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                대상 프로젝트: {projectName}
              </span>
              <span className="text-[11px] text-gray-500">ID: {projectId}</span>
            </div>
            {(intentNeedCount != null || entityNeedCount != null) && (
              <div className="mt-1 text-[11px] text-gray-600">
                needsEmbedding: 인텐트 {intentNeedCount ?? "-"}개, 엔티티{" "}
                {entityNeedCount ?? "-"}개
              </div>
            )}
          </div>
          
          {/* intent/entity일 때 프리뷰 리스트 */}
          {isPickable && (
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                <div className="text-[12px] font-semibold text-gray-800">
                  학습 대상({targetType === "intent" ? "인텐트" : "엔티티"}) 목록
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50"
                    onClick={toggleAll}
                    disabled={previewLoading}
                  >
                    {selectedIds.length === items.length ? "전체 해제" : "전체 선택"}
                  </button>
                  <span className="text-[11px] text-gray-500">
                    선택 {selectedIds.length.toLocaleString("ko-KR")} / {items.length.toLocaleString("ko-KR")}
                  </span>
                </div>
              </div>

              <div className="max-h-56 overflow-auto p-3">
                {previewLoading && (
                  <div className="text-sm text-gray-400">대상을 불러오는 중...</div>
                )}
                {previewError && (
                  <div className="text-sm text-rose-600">{previewError}</div>
                )}
                {!previewLoading && !previewError && items.length === 0 && (
                  <div className="text-sm text-gray-400">학습할 대상이 없습니다(needsEmbedding=true 없음).</div>
                )}

                {!previewLoading && !previewError && items.length > 0 && (
                  <ul className="space-y-2">
                    {items.map((it) => {
                      const checked = selectedIds.includes(it.id);
                      return (
                        <li key={it.id} className="flex items-start gap-2 rounded-md border border-gray-100 p-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() => toggleOne(it.id)}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-[12px] font-semibold text-gray-900 truncate">
                                {it.name || "(no name)"}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {formatDate(it.updatedAt)}
                              </div>
                            </div>
                            {it.description && (
                              <div className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">
                                {it.description}
                              </div>
                            )}
                            <div className="mt-0.5 text-[10px] text-gray-400 break-all">
                              id: {it.id}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {isFullTrain && (
            <>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                <div className="font-semibold">주의</div>
                <ul className="mt-1 list-disc pl-4 text-[11px] text-rose-700 space-y-1">
                  <li>전체 재학습은 비용/시간이 증가할 수 있습니다.</li>
                  <li>진행 중 중단 시 일부만 반영될 수 있습니다.</li>
                  <li>정말 실행하려면 아래에 프로젝트 ID를 입력하세요.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-700">
                  프로젝트 ID 입력 (정확히 일치해야 실행됨)
                </label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={projectId}
                />

                <label className="flex items-center gap-2 text-[11px] text-gray-700">
                  <input
                    type="checkbox"
                    checked={doubleCheck}
                    onChange={(e) => setDoubleCheck(e.target.checked)}
                  />
                  위 내용을 확인했으며, 전체 재학습을 실행합니다.
                </label>
              </div>
            </>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </button>

          <button
            type="button"
            className={[
              "rounded-md px-3 py-1.5 text-[12px] font-semibold text-white",
              isFullTrain
                ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300"
                : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300",
            ].join(" ")}
            disabled={!confirmEnabled || submitting}
            onClick={async () => {
              try {
                setSubmitting(true);
                // intent/entity는 선택 ids 전달
                await onConfirm(isPickable ? selectedIds : undefined);
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "실행 중..." : isPickable ? `선택 ${selectedIds.length}개 학습 실행` : "학습 실행"}
          </button>
        </div>
      </div>
    </div>
  );
}
