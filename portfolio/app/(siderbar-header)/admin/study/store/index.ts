// app/(sidebar-header)/admin/study/store/index.ts
"use client";

import { create } from "zustand";
import type { StudyJob, StudyProjectSummary } from "../types";

// 간단 mock 데이터
const mockProjects: StudyProjectSummary[] = [
  {
    id: "proj-1",
    name: "FAQ 챗봇",
    description: "자주 묻는 질문 답변용 지식 프로젝트",
    defaultLanguage: "ko-KR",
    knowledgeCount: 24,
    lastTrainedAt: "2025-01-10T10:00:00Z",
  },
  {
    id: "proj-2",
    name: "쇼핑 상담봇",
    description: "상품 추천/주문 문의용 프로젝트",
    defaultLanguage: "ko-KR",
    knowledgeCount: 41,
    lastTrainedAt: "2025-01-12T09:30:00Z",
  },
  {
    id: "proj-3",
    name: "식당추천봇",
    description: "음식점 추천 AI 프로젝트",
    defaultLanguage: "ko-KR",
    knowledgeCount: 15,
    lastTrainedAt: null,
  },
];

const mockJobs: StudyJob[] = [
  {
    id: "job-1",
    projectId: "proj-1",
    projectName: "FAQ 챗봇",
    startedAt: "2025-01-10T10:00:00Z",
    finishedAt: "2025-01-10T10:01:30Z",
    status: "success",
    triggeredBy: "admin@hamsfam.ai",
    targetType: "project",
    targetSummary: "프로젝트 전체 지식",
    message: "인텐트 12개, 엔티티 5개 학습 완료",
  },
  {
    id: "job-2",
    projectId: "proj-2",
    projectName: "쇼핑 상담봇",
    startedAt: "2025-01-12T09:30:00Z",
    finishedAt: null,
    status: "running",
    triggeredBy: "admin@hamsfam.ai",
    targetType: "intent",
    targetSummary: "신규 인텐트 3개",
    message: "벡터 임베딩 생성 중...",
  },
  {
    id: "job-3",
    projectId: "proj-2",
    projectName: "쇼핑 상담봇",
    startedAt: "2025-01-11T15:20:00Z",
    finishedAt: "2025-01-11T15:20:45Z",
    status: "failed",
    triggeredBy: "admin@hamsfam.ai",
    targetType: "entity",
    targetSummary: "상품 카테고리 엔티티",
    message: "엔티티 값 중 중복 키가 있어 실패했습니다.",
  },
];

type StudyState = {
  projects: StudyProjectSummary[];
  jobs: StudyJob[];
  selectedProjectId: string | null;
  logFilterProjectId: string | null;

  setSelectedProjectId: (id: string | null) => void;
  enqueueJob: (job: StudyJob) => void;
};

const useStudyStore = create<StudyState>((set) => ({
  projects: mockProjects,
  jobs: mockJobs,
  selectedProjectId: mockProjects[0]?.id ?? null,
  logFilterProjectId: null,

  setSelectedProjectId: (id) =>
    set((state) => ({
      selectedProjectId: id,
      logFilterProjectId: id,
    })),

  enqueueJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs],
    })),
}));

export default useStudyStore;
