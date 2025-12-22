// app/(sidebar-header)/admin/train/components/ProjectSelector.tsx
"use client";

import { ChevronDown } from "lucide-react";
import useStudyStore from "../store";
import type { StudyProjectSummary } from "../types";
import { formatDate } from "@/lib/utils/firebaseUtils"

export default function ProjectSelector() {
  const { projects, selectedProjectId, setSelectedProjectId } = useStudyStore();

  return (
    <div className="flex flex-col gap-2 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-2 py-2">
        <h2 className="text-sm font-semibold text-gray-800">프로젝트 선택</h2>
        <span className="text-[11px] text-gray-400">
          총 {projects.length.toLocaleString("ko-KR")}개
        </span>
      </div>

      <div className="relative px-2">
        <select
          className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
          value={selectedProjectId ?? ""}
          onChange={(e) =>
            setSelectedProjectId(e.target.value || null)
          }
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
      </div>

      {/* 선택 프로젝트 요약 카드 */}
      {selectedProjectId && (
        <SelectedProjectSummary
          project={
            projects.find((p) => p.id === selectedProjectId) ??
            projects[0]
          }
        />
      )}
    </div>
  );
}

function SelectedProjectSummary({
  project,
}: {
  project: StudyProjectSummary;
}) {
  return (
    <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-gray-800">{project.name}</div>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
          기본 언어: {project.defaultLanguage}
        </span>
      </div>
      {project.description && (
        <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
          {project.description}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
        <span className="flex flex-wrap items-center gap-2">
          <span>
            지식개수:{" "}
            <b className="text-gray-700">
              {(project.counts?.knowledge?.total ?? 0) - (project.counts?.knowledge?.untrained ?? 0)}/
              {(project.counts?.knowledge?.total ?? 0)}
            </b>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            인텐트:{" "}
            <b className="text-gray-700">
              {(project.counts?.intents?.total ?? 0) - (project.counts?.intents?.untrained ?? 0)}/
              {(project.counts?.intents?.total ?? 0)}
            </b>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            엔티티:{" "}
            <b className="text-gray-700">
              {(project.counts?.entities?.total ?? 0) - (project.counts?.entities?.untrained ?? 0)}/
              {(project.counts?.entities?.total ?? 0)}
            </b>
          </span>
        </span>
        <span>마지막 학습: {formatDate(project.lastTrain?.finishedAt)}</span>
      </div>
    </div>
  );
}
