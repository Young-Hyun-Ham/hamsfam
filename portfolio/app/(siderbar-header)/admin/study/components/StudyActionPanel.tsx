// app/(sidebar-header)/admin/study/components/StudyActionPanel.tsx
"use client";

import { useState } from "react";
import useStudyStore from "../store";

export default function StudyActionPanel() {
  const { selectedProjectId, projects, enqueueJob } = useStudyStore();
  const [isRunningMock, setIsRunningMock] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleEnqueue = (targetType: "project" | "intent" | "entity") => {
    if (!selectedProject) return;
    const id = `job-${Date.now()}`;
    enqueueJob({
      id,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: "running",
      triggeredBy: "admin@hamsfam.ai",
      targetType,
      targetSummary:
        targetType === "project"
          ? "프로젝트 전체 지식"
          : targetType === "intent"
          ? "최근 수정된 인텐트"
          : "최근 수정된 엔티티",
      message: "Mock 학습 작업이 큐에 등록되었습니다.",
    });

    // 실제 구현시에는 백엔드 호출하면 됨
    setIsRunningMock(true);
    setTimeout(() => setIsRunningMock(false), 1500);
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            학습 실행
          </h3>
          <p className="mt-1 text-[11px] text-gray-500">
            선택한 프로젝트의 지식을 학습 서버에 반영합니다.
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
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          disabled={!selectedProject || isRunningMock}
          onClick={() => handleEnqueue("project")}
        >
          전체 지식 다시 학습
        </button>
        <button
          type="button"
          className="rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          disabled={!selectedProject || isRunningMock}
          onClick={() => handleEnqueue("intent")}
        >
          최근 수정 인텐트만 학습
        </button>
        <button
          type="button"
          className="rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          disabled={!selectedProject || isRunningMock}
          onClick={() => handleEnqueue("entity")}
        >
          최근 수정 엔티티만 학습
        </button>
      </div>

      {isRunningMock && (
        <p className="mt-2 text-[11px] text-indigo-600">
          Mock 학습 작업이 실행 중입니다...
        </p>
      )}
    </div>
  );
}
