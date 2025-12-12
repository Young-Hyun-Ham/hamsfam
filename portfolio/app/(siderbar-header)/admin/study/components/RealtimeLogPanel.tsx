// app/(sidebar-header)/admin/study/components/RealtimeLogPanel.tsx
"use client";

import { useMemo } from "react";
import useStudyStore from "../store";

export default function RealtimeLogPanel() {
  const { jobs, selectedProjectId } = useStudyStore();

  const recentLogs = useMemo(
    () =>
      jobs
        .filter((j) =>
          selectedProjectId ? j.projectId === selectedProjectId : true
        )
        .slice(0, 8),
    [jobs, selectedProjectId]
  );

  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-[11px]">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-800">실시간 로그</h3>
        <span className="text-[10px] text-gray-400">
          최근 {recentLogs.length}건
        </span>
      </div>
      <div className="mt-2 max-h-48 overflow-auto pr-1">
        {recentLogs.length === 0 ? (
          <p className="text-[11px] text-gray-400">
            아직 학습 로그가 없습니다.
          </p>
        ) : (
          <ul className="space-y-1">
            {recentLogs.map((job) => (
              <li
                key={job.id}
                className="rounded-md bg-gray-50 px-2 py-1 text-[10px] text-gray-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{job.projectName}</span>
                  <span className="text-[9px] text-gray-400">
                    {new Date(job.startedAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mt-0.5 text-gray-600">{job.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
