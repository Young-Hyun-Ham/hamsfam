// app/(sidebar-header)/admin/knowledge/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  KnowledgeProject,
  KnowledgeIntent,
  KnowledgeEntity,
  KnowledgeProjectStatus,
} from "./types";
import ProjectListPanel from "./components/ProjectListPanel";
import IntentEntityTabs from "./components/IntentEntityTabs";

// ---- MOCK DATA ----
const mockProjects: KnowledgeProject[] = Array.from({ length: 20 }).map(
  (_, i) => ({
    id: `proj-${i + 1}`,
    name: [
      "FAQ 챗봇",
      "쇼핑 상담봇",
      "A/S 문의봇",
      "주문관리봇",
      "결제도움봇",
      "호텔예약봇",
      "식당추천봇",
      "고객센터봇",
      "배송상담봇",
      "예약확인봇",
      "상품추천봇",
      "영업문의봇",
      "기술지원봇",
      "공지알림봇",
      "상담자동화봇",
      "업무지원봇",
      "설문봇",
      "쿠폰관리봇",
      "포인트조회봇",
      "티켓예매봇",
    ][i],

    description: [
      "자주 묻는 질문을 자동으로 답변하는 프로젝트",
      "상품 추천 및 주문 관련 문의 처리",
      "고객의 A/S 문의를 자동 처리하는 프로젝트",
      "주문/취소/교환 관련 질의를 처리",
      "결제 과정에서 발생하는 질문 지원",
      "호텔 예약 관련 고객 문의 자동화",
      "음식점 추천 AI 프로젝트",
      "CS 자동화를 위한 고객센터 챗봇",
      "배송 위치/상태 질의 자동응답",
      "예약 확인 및 일정 변경 문의 처리",
      "사용자 취향 기반 상품 추천 챗봇",
      "영업/제휴 문의 자동 답변 시스템",
      "기술지원 상담 업무 자동화",
      "사내 공지 및 알림 자동화",
      "상담 인입 업무 경감 목적 챗봇",
      "사내 직원 업무 보조 자동화",
      "설문 응답을 자동 수집하는 시스템",
      "쿠폰 발급/조회 자동화",
      "포인트 조회 및 적립 안내",
      "티켓 예매 관련 문의 지원",
    ][i],

    defaultLanguage: "ko-KR",
    status: ["active", "draft", "archived"][i % 3] as KnowledgeProjectStatus,
    createdAt: `2025-01-01T10:00:00Z`,
    updatedAt: `2025-01-01T12:00:00Z`,
  })
);

const mockIntents: KnowledgeIntent[] = [
  {
    id: "intent-1",
    projectId: "proj-1",
    name: "greeting",
    displayName: "인사",
    description: "사용자의 기본 인사 발화 처리",
    trainingPhrases: ["안녕", "안녕하세요", "하이", "반가워"],
    responseTemplate: "안녕하세요! 무엇을 도와드릴까요?",
    tags: ["common"],
    isFallback: false,
    createdAt: "2025-01-01T10:00:00Z",
    updatedAt: "2025-01-01T10:00:00Z",
  },
  {
    id: "intent-2",
    projectId: "proj-1",
    name: "faq_delivery",
    displayName: "배송 문의",
    description: "배송 관련 자주 묻는 질문",
    trainingPhrases: ["배송 언제와?", "택배 어디쯤이에요?", "배송 조회"],
    responseTemplate: "주문번호를 알려주시면 배송 상태를 안내해 드릴게요.",
    tags: ["faq"],
    isFallback: false,
    createdAt: "2025-01-01T10:00:00Z",
    updatedAt: "2025-01-02T10:00:00Z",
  },
  {
    id: "intent-3",
    projectId: "proj-1",
    name: "fallback",
    displayName: "Fallback 인텐트",
    description: "어떤 인텐트에도 매칭되지 않을 때",
    trainingPhrases: [],
    responseTemplate: "죄송해요, 잘 이해하지 못했어요. 다시 한 번 말씀해주시겠어요?",
    tags: [],
    isFallback: true,
    createdAt: "2025-01-01T10:00:00Z",
    updatedAt: "2025-01-02T10:00:00Z",
  },
  {
    id: "intent-4",
    projectId: "proj-2",
    name: "product_recommend",
    displayName: "상품 추천",
    description: "사용자 취향 기반 상품 추천",
    trainingPhrases: ["운동화 추천해줘", "여름용 반팔 티 추천해줘"],
    responseTemplate: "몇 가지 상품을 추천해 드릴게요!",
    tags: ["shopping"],
    isFallback: false,
    createdAt: "2025-01-05T10:00:00Z",
    updatedAt: "2025-01-06T10:00:00Z",
  },
];

const mockEntities: KnowledgeEntity[] = [];

for (let p = 1; p <= 20; p++) {
  const projectId = `proj-${p}`;

  mockEntities.push(
    {
      id: `entity-${p}-1`,
      projectId,
      name: `status_${p}`,
      displayName: "상태값",
      kind: "list",
      values: [
        { value: "대기중", synonyms: ["대기", "처리전"] },
        { value: "진행중", synonyms: ["처리중", "작업중"] },
        { value: "완료", synonyms: ["끝남", "완료됨"] },
      ],
      createdAt: "2025-01-01T10:00:00Z",
      updatedAt: "2025-01-01T10:00:00Z",
    },
    {
      id: `entity-${p}-2`,
      projectId,
      name: `code_${p}`,
      displayName: "코드 패턴",
      kind: "regex",
      values: [],
      regexPattern: "^[A-Z]{3}-[0-9]{4}$",
      createdAt: "2025-01-02T10:00:00Z",
      updatedAt: "2025-01-02T10:00:00Z",
    }
  );
}

export default function KnowledgeAdminPage() {
  const [projects, setProjects] = useState<KnowledgeProject[]>(mockProjects);
  const [intents, setIntents] = useState<KnowledgeIntent[]>(mockIntents);
  const [entities, setEntities] = useState<KnowledgeEntity[]>(mockEntities);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    mockProjects[0]?.id ?? null
  );

  // Project 생성 (임시: 클라이언트에서만 push)
  const handleCreateProject = (payload: {
    name: string;
    description?: string;
  }) => {
    const now = new Date().toISOString();
    const newProject: KnowledgeProject = {
      id: `proj-${projects.length + 1}`,
      name: payload.name,
      description: payload.description,
      defaultLanguage: "ko-KR",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [...prev, newProject]);
    setSelectedProjectId(newProject.id);
  };

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const currentIntents = useMemo(
    () => intents.filter((it) => it.projectId === selectedProjectId),
    [intents, selectedProjectId]
  );

  const currentEntities = useMemo(
    () => entities.filter((e) => e.projectId === selectedProjectId),
    [entities, selectedProjectId]
  );

  return (
    <div className="p-6 bg-gray-50 h-full font-sans flex flex-col">
      {/* Breadcrumb Navigation */}
      <div className="text-sm text-gray-500 mb-4">
        Admin
        <span className="mx-1"> / </span>
        <span className="text-gray-800 font-semibold">지식관리</span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 flex-1 min-h-0 flex flex-col">
        {/* 상단 타이틀 + 설명 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">지식관리</h1>
          <p className="mt-1 text-xs text-gray-500">
            현재는 Firestore/DB 연결 없이, mock 데이터로 화면 흐름만 확인하는
            버전입니다.
          </p>
        </div>

        <div className="flex flex-1 min-h-0 bg-white rounded-md shadow-sm border border-gray-100">
          {/* 좌측: 프로젝트 패널 */}
          <div className="w-64 bg-gray-50/50 border-r border-gray-100">
            <ProjectListPanel
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onCreateProject={handleCreateProject}
            />
          </div>

          {/* 우측: 인텐트/엔티티 탭 */}
          <div className="flex-1 min-w-0">
            <IntentEntityTabs
              project={selectedProject}
              intents={currentIntents}
              entities={currentEntities}
              loading={false}
              error={null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
