// app/(sidebar-header)/admin/train/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import useStudyStore from "./store";
import ProjectSelector from "./components/ProjectSelector";
import StudyActionPanel from "./components/StudyActionPanel";
import StudyJobTable from "./components/StudyJobTable";
import RealtimeLogPanel from "./components/RealtimeLogPanel";

export default function TrainPage() {
  const {
    loading,
    error,
    projects,
    jobs,
    selectedProjectId,
    fetchProjects,
    fetchJobs,
    setSelectedJobId,
  } = useStudyStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 프로젝트 선택되면 해당 프로젝트 학습이력 로드
  useEffect(() => {
    // 선택 해제면 화면도 초기화
    if (!selectedProjectId) {
      setSelectedJobId(null);
      fetchJobs(null); // 아래 store에서 null 처리(=jobs 비움)하도록 수정 권장
      return;
    }

    setSelectedJobId(null);      // 이전 선택 job 로그/선택 초기화
    fetchJobs(selectedProjectId);
  }, [selectedProjectId, fetchJobs, setSelectedJobId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  return (
    <div className="p-6">
      <div className="mb-4 text-sm text-gray-500">Admin / 지식 학습</div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProjectSelector />

        <StudyActionPanel />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StudyJobTable jobs={jobs} />
        </div>
        <div className="lg:col-span-1">
          <RealtimeLogPanel />
        </div>
      </div>
    </div>
  );
}

