// app/(siderbar-header)/admin/train/components/RealtimeLogPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useStudyStore from "../store";
import type { StudyJobLog } from "../types";

function formatTime(v?: string) {
  if (!v) return "";
  // "2025-..." 형태라면 앞부분만
  return v.replace("T", " ").replace("Z", "").slice(0, 19);
}

function levelBadge(level: string) {
  if (level === "error") return "bg-rose-100 text-rose-700";
  if (level === "warn") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

export default function RealtimeLogPanel() {
  const {
    jobs,
    selectedJobId,
    setSelectedJobId,
    logsByJobId,
    fetchLogs,
  } = useStudyStore();

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const logs: StudyJobLog[] = useMemo(() => {
    if (!selectedJobId) return [];
    return logsByJobId[selectedJobId] ?? [];
  }, [logsByJobId, selectedJobId]);

  const [polling, setPolling] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 스크롤을 항상 아래로
  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs.length, selectedJobId]);

  // job 선택될 때: 즉시 1회 로드 + running이면 폴링
  useEffect(() => {
    if (!selectedJobId || !selectedJob) return;

    let timer: any = null;
    let stopped = false;

    const loadOnce = async () => {
      try {
        const r = await fetchLogs(selectedJobId);
        if (r?.retryable) return;
      } catch (e) {
        clearInterval(timer); setPolling(false); return;
      }
    };

    const startPolling = () => {
      if (timer) clearInterval(timer);
      setPolling(true);

      timer = setInterval(async () => {
        if (stopped) return;
        await loadOnce();

        // ✅ jobs 상태가 success/failed로 바뀌면 폴링 자동 종료
        const latest = useStudyStore.getState().jobs.find((j) => j.id === selectedJobId);
        if (!latest || latest.status !== "running") {
          clearInterval(timer);
          timer = null;
          setPolling(false);
        }
      }, 2000);
    };

    // 최초 1회
    loadOnce().then(() => {
      if (selectedJob.status === "running") startPolling();
      else setPolling(false);
    });

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      setPolling(false);
    };
  }, [selectedJobId, selectedJob?.status, fetchLogs]);

  const headerRight = useMemo(() => {
    if (!selectedJob) return null;
    const status = selectedJob.status;
    const badge =
      status === "running"
        ? "bg-indigo-100 text-indigo-700"
        : status === "success"
        ? "bg-emerald-100 text-emerald-700"
        : status === "failed"
        ? "bg-rose-100 text-rose-700"
        : "bg-gray-100 text-gray-700";

    return (
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge}`}>
          {status}
        </span>
        {polling && (
          <span className="text-[11px] text-gray-400">폴링중(2s)</span>
        )}
      </div>
    );
  }, [selectedJob, polling]);

  return (
    <div className="rounded-lg border bg-white h-full flex flex-col">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold">실시간 로그</div>
        {headerRight}
      </div>

      {/* 선택 안내 */}
      {!selectedJob && (
        <div className="p-4 text-sm text-gray-500">
          좌측 이력에서 Job을 선택하면 로그가 표시됩니다.
        </div>
      )}

      {selectedJob && (
        <>
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="text-[12px] font-semibold text-gray-800">
              {selectedJob.projectName} /{" "}
              {selectedJob.targetSummary ?? selectedJob.targetType}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-600">
              <span>jobId: {selectedJob.id}</span>
              <span>started: {formatTime(selectedJob.startedAt)}</span>
              {selectedJob.finishedAt && (
                <span>finished: {formatTime(selectedJob.finishedAt)}</span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50"
                onClick={() => fetchLogs(selectedJob.id)}
              >
                새로고침
              </button>
              <button
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50"
                onClick={() => setSelectedJobId(null)}
              >
                닫기
              </button>
            </div>
          </div>

          {/* 로그 본문 */}
          <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
            {logs.length === 0 ? (
              <div className="text-sm text-gray-400">
                아직 로그가 없습니다.
              </div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="rounded-md border border-gray-100 p-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        levelBadge(l.level),
                      ].join(" ")}
                    >
                      {l.level}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatTime(l.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-gray-800 whitespace-pre-wrap">
                    {l.message}
                  </div>
                  {l.meta && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[10px] text-gray-600">
                      {JSON.stringify(l.meta, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </>
      )}
    </div>
  );
}
