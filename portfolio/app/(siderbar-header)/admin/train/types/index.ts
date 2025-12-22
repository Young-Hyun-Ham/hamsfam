// app/(sidebar-header)/admin/train/types/index.ts

export type StudyLastTrain = {
  jobId: string;
  status: "queued" | "running" | "success" | "failed" | string;
  targetType?: string;
  targetSummary?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
  message?: string;
};

export type TrainPreviewItem = {
  id: string;
  name: string;
  description?: string;
  updatedAt?: string | null;
  needsEmbedding: boolean;
};

type KnowledgeCounts = {
  intents: { total: number; untrained: number };
  entities: { total: number; untrained: number };
  knowledge: { total: number; untrained: number }; // intents+entities
};

export type StudyProjectSummary = {
  id: string;
  name: string;
  description?: string;
  defaultLanguage: string;
  knowledgeCount: number; // 인텐트/엔티티 등 지식 개수 합계

  lastTrain?: StudyLastTrain | null;
  counts?: KnowledgeCounts | null;
};

export type StudyJobStatus = "pending" | "running" | "success" | "failed";

export type StudyJob = {
  id: string;
  projectId: string;
  projectName: string;
  startedAt: string;
  finishedAt?: string | null;
  status: StudyJobStatus;
  triggeredBy: string; // 관리자 이름/이메일
  targetType: "project" | "intent" | "entity";
  targetSummary: string; // 예: "전체 인텐트", "인텐트 5개", "엔티티 3개"
  message?: string;
};

export type StudyJobLog = {
  id: string;
  createdAt: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: any;
};