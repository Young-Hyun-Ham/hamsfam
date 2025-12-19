// app/(sidebar-header)/admin/train/store/index.ts
"use client";

import { create } from "zustand";
import type { StudyJob, StudyProjectSummary } from "../types";

// // 간단 mock 데이터
// const mockProjects: StudyProjectSummary[] = [
//   {
//     id: "proj-1",
//     name: "FAQ 챗봇",
//     description: "자주 묻는 질문 답변용 지식 프로젝트",
//     defaultLanguage: "ko-KR",
//     knowledgeCount: 24,
//     lastTrainedAt: "2025-01-10T10:00:00Z",
//   },
//   {
//     id: "proj-2",
//     name: "쇼핑 상담봇",
//     description: "상품 추천/주문 문의용 프로젝트",
//     defaultLanguage: "ko-KR",
//     knowledgeCount: 41,
//     lastTrainedAt: "2025-01-12T09:30:00Z",
//   },
//   {
//     id: "proj-3",
//     name: "식당추천봇",
//     description: "음식점 추천 AI 프로젝트",
//     defaultLanguage: "ko-KR",
//     knowledgeCount: 15,
//     lastTrainedAt: null,
//   },
// ];

// const mockJobs: StudyJob[] = [
//   {
//     id: "job-1",
//     projectId: "proj-1",
//     projectName: "FAQ 챗봇",
//     startedAt: "2025-01-10T10:00:00Z",
//     finishedAt: "2025-01-10T10:01:30Z",
//     status: "success",
//     triggeredBy: "admin@hamsfam.ai",
//     targetType: "project",
//     targetSummary: "프로젝트 전체 지식",
//     message: "인텐트 12개, 엔티티 5개 학습 완료",
//   },
//   {
//     id: "job-2",
//     projectId: "proj-2",
//     projectName: "쇼핑 상담봇",
//     startedAt: "2025-01-12T09:30:00Z",
//     finishedAt: null,
//     status: "running",
//     triggeredBy: "admin@hamsfam.ai",
//     targetType: "intent",
//     targetSummary: "신규 인텐트 3개",
//     message: "벡터 임베딩 생성 중...",
//   },
//   {
//     id: "job-3",
//     projectId: "proj-2",
//     projectName: "쇼핑 상담봇",
//     startedAt: "2025-01-11T15:20:00Z",
//     finishedAt: "2025-01-11T15:20:45Z",
//     status: "failed",
//     triggeredBy: "admin@hamsfam.ai",
//     targetType: "entity",
//     targetSummary: "상품 카테고리 엔티티",
//     message: "엔티티 값 중 중복 키가 있어 실패했습니다.",
//   },
// ];
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND || "firebase").toLowerCase();
const KNOWLEDGE_BASE = `/api/admin/${BACKEND}/knowledge`;
const TRAIN_BASE = `/api/admin/${BACKEND}/train`;

type StudyState = {
  loading: boolean;
  error: string | null;

  projects: StudyProjectSummary[];
  jobs: StudyJob[];
  selectedProjectId: string | null;
  logFilterProjectId: string | null;

  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  logsByJobId: Record<string, any[]>;

  fetchProjects: () => Promise<void>;
  fetchJobs: (projectId?: string | null) => Promise<void>;
  fetchLogs: (jobId: string) => Promise<{ok: boolean, retryable?: boolean, status: number}>;

  setSelectedProjectId: (id: string | null) => void;
  enqueueJob: (job: StudyJob) => void;
  patchJob: (id: string, patch: Partial<StudyJob>) => void;

  runTrain: (args: {
    jobId: string;
    projectId: string;
    projectName: string;
    targetType: "project" | "intent" | "entity";
    triggeredBy: string;
  }) => Promise<void>;
};

const useStudyStore = create<StudyState>((set, get) => ({
  loading: false,
  error: null,

  projects: [],
  jobs: [],
  selectedProjectId: null,
  logFilterProjectId: null,

  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
  logsByJobId: {},

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${KNOWLEDGE_BASE}/projects`, { method: "GET" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`projects fetch 실패: ${res.status} ${msg}`);
      }
      const data = await res.json(); // { items: KnowledgeProject[] }

      // KnowledgeProject -> StudyProjectSummary 로 매핑
      const items = Array.isArray(data?.items) ? data.items : [];
      const projects: StudyProjectSummary[] = items.map((p: any) => ({
        id: p.id,
        name: p.name ?? p.title ?? "제목없음",
        description: p.description ?? "",
        defaultLanguage: p.defaultLanguage ?? "ko-KR",
        knowledgeCount: Number(p.knowledgeCount ?? 0),
        lastTrainedAt: p.lastTrainedAt ?? null,

        // (선택) needsEmbedding 카운트를 서버가 주면 바로 연결
        intentNeedCount: p.intentNeedCount,
        entityNeedCount: p.entityNeedCount,
      }));

      set({ projects });

      // ✅ 최초 진입 시 첫 프로젝트 자동 선택
      const cur = get().selectedProjectId;
      if (!cur && projects.length > 0) {
        set({
          selectedProjectId: projects[0].id,
          logFilterProjectId: projects[0].id,
        });
      }
    } catch (e: any) {
      set({ error: e?.message ?? "프로젝트 조회 실패" });
    } finally {
      set({ loading: false });
    }
  },

  fetchJobs: async (projectId) => {
    try {
      const pid = projectId ?? get().selectedProjectId;
      const qs = pid ? `?projectId=${encodeURIComponent(pid)}` : "";
      const res = await fetch(`${TRAIN_BASE}/jobs${qs}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set({ jobs: Array.isArray(data?.items) ? data.items : [] });
    } catch (e: any) {
      set({ error: e?.message ?? "학습 이력 조회 실패" });
    }
  },

  fetchLogs: async (jobId: string) => {

    try {
      const res = await fetch(
        `/api/admin/${BACKEND}/train/jobs/${jobId}/logs?limit=200`,
        { method: "GET" }
      );

      // ✅ 404: job/log가 아직 준비 안 됐을 수 있음 (정상적인 “대기” 상태)
      //    - 폴링은 계속하되, 에러로 취급하지 않음
      if (res.status === 404) {
        return { ok: false, retryable: true, status: 404 };
      }

      // ✅ 429/503 같은 경우도 일시적일 수 있으니 retryable 로 처리(선택)
      if (res.status === 429 || res.status === 503) {
        const msg = await res.text().catch(() => "");
        console.warn("fetchLogs retryable:", res.status, msg);
        return { ok: false, retryable: true, status: res.status };
      }

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        // ❌ 여기서 throw 해야 RealtimeLogPanel 폴링이 멈출 수 있음
        throw new Error(`logs fetch 실패: ${res.status} ${msg}`);
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      set((state) => ({
        logsByJobId: {
          ...state.logsByJobId,
          [jobId]: items, // ✅ jobId 단위로 덮어씀
        },
      }));

      return { ok: true, status: 200 };
    } catch (e: any) {
      // ❌ 네트워크/서버 5xx/파싱 오류 등은 "치명"으로 보고 throw
      console.error("fetchLogs error:", e);
      throw e;
    }
  },

  setSelectedProjectId: (id) =>
    set(() => ({
      selectedProjectId: id,
      logFilterProjectId: id,
    })),

  enqueueJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs],
    })),

  patchJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),

  runTrain: async ({ jobId, projectId, projectName, targetType, triggeredBy }) => {
    // optimistic 상태(이미 enqueueJob 했더라도 안전하게 running 패치)
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, status: "running", finishedAt: null } : j
      ),
    }));

    const res = await fetch(`${TRAIN_BASE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, projectId, projectName, targetType, triggeredBy }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? { ...j, status: "failed", finishedAt: new Date().toISOString(), message: msg }
            : j
        ),
      }));
      throw new Error(msg);
    }

    // 성공이면 jobs를 서버 기준으로 다시 sync
    await get().fetchJobs(projectId);

    // logs는 “실패하면 중지” 정책 적용
    try {
      await get().fetchLogs(jobId);
    } catch (e: any) {
      const msg = e?.message ?? "로그 조회 실패로 학습 흐름 중단";

      // ✅ job을 실패로 전환해서 UI/폴링이 멈추도록
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? { ...j, status: "failed", finishedAt: new Date().toISOString(), message: msg }
            : j
        ),
      }));

      // ✅ 여기서 throw → ActionPanel에서도 잡혀서 alert, 폴링도 멈춤
      throw new Error(msg);
    }

    // 프로젝트 lastTrainedAt도 갱신(선택)
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, lastTrainedAt: new Date().toISOString() } : p
      ),
    }));
  },
}));

export default useStudyStore;
