// app/(sidebar-header)/admin/study/page.tsx
"use client";

import ProjectSelector from "./components/ProjectSelector";
import StudyActionPanel from "./components/StudyActionPanel";
import StudyJobTable from "./components/StudyJobTable";
import RealtimeLogPanel from "./components/RealtimeLogPanel";

export default function KnowledgeStudyPage() {
  return (
    <div className="p-6 bg-gray-50 h-full font-sans flex flex-col">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-gray-500">
        Admin
        <span className="mx-1"> / </span>
        <span className="text-gray-800 font-semibold">지식 학습</span>
      </div>

      <div className="flex-1 min-h-0 rounded-lg bg-white p-4 shadow-sm flex flex-col space-y-4">
        {/* 상단: 프로젝트 선택 + 학습 실행 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ProjectSelector />
          <StudyActionPanel />
        </div>

        {/* 하단: 좌측 이력 테이블 / 우측 로그 */}
        <div className="flex-1 min-h-0 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <StudyJobTable />
          <RealtimeLogPanel />
        </div>
      </div>
    </div>
  );
}
