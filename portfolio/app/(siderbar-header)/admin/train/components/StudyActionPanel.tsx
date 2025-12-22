// app/(siderbar-header)/admin/train/components/StudyActionPanel.tsx
"use client";

import { useMemo, useState } from "react";
import useStudyStore from "../store";
import ConfirmTrainModal from "./modal/ConfirmTrainModal";

type TargetType = "project" | "intent" | "entity";

export default function StudyActionPanel() {
  const {
    selectedProjectId,
    projects,
    enqueueJob,
    runTrain,
    setSelectedJobId,
  } = useStudyStore();

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  // ✅ 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<TargetType>("project");
  const [submitting, setSubmitting] = useState(false);

  const openConfirm = (t: TargetType) => {
    if (!selectedProject) return;
    setTargetType(t);
    setModalOpen(true);
  };

  const handleConfirmRun = async (selectedIds?: string[]) => {
    if (!selectedProject) return;
    if (submitting) return;

    setSubmitting(true);

    // 1) UI 즉시 반응: job row 먼저 추가(optimistic)
    const jobId = `job-${Date.now()}`;
    const triggeredBy = "admin@hamsfam.ai"; // TODO: 로그인 유저 이메일 연결

    enqueueJob({
      id: jobId,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: "running",
      triggeredBy,
      targetType,
      targetSummary:
        targetType === "project"
          ? "프로젝트 전체 지식"
          : targetType === "intent"
          ? "최근 수정된 인텐트"
          : "최근 수정된 엔티티",
      message: "학습 작업을 시작했습니다...",
    });

    // ✅ 로그 패널이 바로 해당 job을 보도록 선택
    setSelectedJobId?.(jobId);

    // ✅ 모달 먼저 닫아 UX 정리
    setModalOpen(false);

    // 2) 서버 호출(실제 학습)
    try {
      const payload = {
        jobId,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        targetType,
        triggeredBy,
        targetIds: selectedIds,
      }
      await runTrain(payload);
      // 성공/실패 상태 업데이트는 store에서 처리됨(fetchJobs/fetchLogs까지)
    } catch (e: any) {
      // store가 job을 failed로 바꿔주지만, 사용자에게는 한 번 알려주자
      alert(e?.message ?? "학습 실행에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">학습 실행</h3>
          <p className="mt-1 text-[11px] text-gray-500">
            선택한 프로젝트의 지식을 학습(임베딩) 서버에 반영합니다.
          </p>
        </div>

        {selectedProject && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
            대상 프로젝트: {selectedProject.name}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="cursor-pointer rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          disabled={!selectedProject || submitting}
          onClick={() => openConfirm("project")}
        >
          전체 지식 다시 학습
        </button>

        <button
          type="button"
          className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          disabled={!selectedProject || submitting}
          onClick={() => openConfirm("intent")}
        >
          최근 수정 인텐트만 학습
        </button>

        <button
          type="button"
          className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          disabled={!selectedProject || submitting}
          onClick={() => openConfirm("entity")}
        >
          최근 수정 엔티티만 학습
        </button>
      </div>

      {/* ✅ Confirm Modal */}
      {selectedProject && (
        <ConfirmTrainModal
          open={modalOpen}
          targetType={targetType}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          intentNeedCount={(selectedProject as any).intentNeedCount}
          entityNeedCount={(selectedProject as any).entityNeedCount}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirmRun}
        />
      )}
    </div>
  );
}
