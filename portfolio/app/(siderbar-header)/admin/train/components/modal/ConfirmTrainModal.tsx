"use client";

import { useEffect, useMemo, useState } from "react";

type TargetType = "project" | "intent" | "entity";

type Props = {
  open: boolean;
  targetType: TargetType;
  projectId: string;
  projectName: string;
  // (선택) needsEmbedding 카운트 표시용
  intentNeedCount?: number;
  entityNeedCount?: number;

  onClose: () => void;
  onConfirm: () => Promise<void> | void;
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

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setDoubleCheck(false);
      setSubmitting(false);
    }
  }, [open]);

  const isFullTrain = targetType === "project";

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
    if (!isFullTrain) return true;
    return confirmText.trim() === projectId && doubleCheck;
  }, [isFullTrain, confirmText, projectId, doubleCheck]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
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
                await onConfirm();
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "실행 중..." : "학습 실행"}
          </button>
        </div>
      </div>
    </div>
  );
}
