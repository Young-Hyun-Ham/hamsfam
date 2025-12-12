// app/(sidebar-header)/admin/study/components/StudyJobTable.tsx
"use client";

import { useMemo, useState } from "react";
import useStudyStore from "../store";
import type { StudyJobStatus } from "../types";

const STATUS_LABEL: Record<StudyJobStatus, string> = {
  pending: "대기중",
  running: "실행중",
  success: "성공",
  failed: "실패",
};

const STATUS_CLASS: Record<StudyJobStatus, string> = {
  pending: "bg-gray-50 text-gray-700 border-gray-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const PAGE_SIZE = 10;

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudyJobTable() {
  const { jobs, selectedProjectId } = useStudyStore();
  const [statusFilter, setStatusFilter] = useState<StudyJobStatus | "all">(
    "all"
  );
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (selectedProjectId && job.projectId !== selectedProjectId)
        return false;
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      return true;
    });
  }, [jobs, selectedProjectId, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paged = filtered.slice(start, end);

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-100 bg-white">
      {/* 헤더 + 필터 */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            학습 실행 이력
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            최근 학습 작업 상태와 메시지를 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
          >
            <option value="all">전체 상태</option>
            <option value="pending">대기중</option>
            <option value="running">실행중</option>
            <option value="success">성공</option>
            <option value="failed">실패</option>
          </select>
        </div>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-auto">
        {paged.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="text-xs text-gray-500">
              표시할 학습 이력이 없습니다.
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              상단에서 학습을 실행하면 이력이 추가됩니다.
            </p>
          </div>
        ) : (
          <table className="min-w-full border-collapse text-[11px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                  상태
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                  대상
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                  시작/종료
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                  실행자
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                  메시지
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="border-t border-gray-100 px-3 py-2 align-top">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        STATUS_CLASS[job.status],
                      ].join(" ")}
                    >
                      {STATUS_LABEL[job.status]}
                    </span>
                  </td>
                  <td className="border-t border-gray-100 px-3 py-2 align-top">
                    <div className="font-semibold text-gray-800">
                      {job.projectName}
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-500">
                      {job.targetSummary} ({job.targetType})
                    </div>
                  </td>
                  <td className="border-t border-gray-100 px-3 py-2 align-top text-gray-700">
                    <div>시작: {formatDateTime(job.startedAt)}</div>
                    <div>종료: {formatDateTime(job.finishedAt)}</div>
                  </td>
                  <td className="border-t border-gray-100 px-3 py-2 align-top text-gray-700">
                    {job.triggeredBy}
                  </td>
                  <td className="border-t border-gray-100 px-3 py-2 align-top text-gray-700">
                    {job.message ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-600">
          <span>
            총 {filtered.length}건 / 페이지 {safePage} / {totalPages}
          </span>
          <div className="space-x-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-0.5 disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-0.5 disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
