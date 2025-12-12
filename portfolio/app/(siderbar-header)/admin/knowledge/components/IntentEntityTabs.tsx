// app/(sidebar-header)/admin/knowledge/components/IntentEntityTabs.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  KnowledgeProject,
  KnowledgeIntent,
  KnowledgeEntity,
} from "../types";

type ActiveTab = "intents" | "entities";

type IntentEntityTabsProps = {
  project: KnowledgeProject | null;
  intents: KnowledgeIntent[];
  entities: KnowledgeEntity[];
  loading?: boolean;
  error?: string | null;
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center border-b-2 px-3 py-2 text-xs font-medium",
        active
          ? "border-indigo-500 text-indigo-600"
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

const INTENT_PAGE_SIZE = 8;
const ENTITY_PAGE_SIZE = 10;

export default function IntentEntityTabs({
  project,
  intents,
  entities,
  loading = false,
  error = null,
}: IntentEntityTabsProps) {
  const [tab, setTab] = useState<ActiveTab>("intents");
  const [intentPage, setIntentPage] = useState(1);
  const [entityPage, setEntityPage] = useState(1);

  // 프로젝트가 바뀔 때 페이지 초기화
  useEffect(() => {
    setIntentPage(1);
    setEntityPage(1);
  }, [project?.id]);

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white">
        <p className="text-sm font-medium text-gray-700">
          왼쪽에서 프로젝트를 선택해주세요.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          인텐트/엔티티는 프로젝트 단위로 관리됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 상단 헤더 */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                {project.name}
              </h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                프로젝트 ID: {project.id}
              </span>
            </div>
            {project.description && (
              <p className="mt-1 text-xs text-gray-500">
                {project.description}
              </p>
            )}
          </div>
          <div className="text-right text-[11px] text-gray-400">
            기본 언어: {project.defaultLanguage || "ko-KR"}
          </div>
        </div>

        {/* 탭 버튼 */}
        <div className="mt-3 flex gap-2">
          <TabButton
            active={tab === "intents"}
            onClick={() => setTab("intents")}
          >
            인텐트 ({intents.length})
          </TabButton>
          <TabButton
            active={tab === "entities"}
            onClick={() => setTab("entities")}
          >
            엔티티 ({entities.length})
          </TabButton>
        </div>
      </div>

      {/* 에러/로딩 */}
      {(loading || error) && (
        <div className="bg-gray-50 px-4 py-2 text-[11px]">
          {loading && (
            <span className="text-gray-400">
              프로젝트 데이터를 불러오는 중입니다...
            </span>
          )}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {tab === "intents" ? (
          <IntentListView
            items={intents}
            page={intentPage}
            pageSize={INTENT_PAGE_SIZE}
            onPageChange={setIntentPage}
          />
        ) : (
          <EntityListView
            items={entities}
            page={entityPage}
            pageSize={ENTITY_PAGE_SIZE}
            onPageChange={setEntityPage}
          />
        )}
      </div>
    </div>
  );
}

/* ----------------- 인텐트 탭 ----------------- */

function IntentListView({
  items,
  page,
  pageSize,
  onPageChange,
}: {
  items: KnowledgeIntent[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const paged = items.slice(start, end);

  useEffect(() => {
    onPageChange(1);
  }, [items, onPageChange]);

  return (
    <div className="flex h-full flex-col">
      {/* 상단 툴바 */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="text-xs font-medium text-gray-700">
          인텐트 ({items.length})
        </div>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700"
          onClick={() => {
            alert("인텐트 추가 모달 TODO (현재는 mock 화면)");
          }}
        >
          인텐트 추가
        </button>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {paged.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="text-xs text-gray-500">
              아직 등록된 인텐트가 없습니다.
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              상단 &ldquo;인텐트 추가&rdquo; 버튼으로 학습할 의도를
              등록해보세요.
            </p>
          </div>
        ) : (
          <div className="px-3 py-2">
            <div className="overflow-hidden border-gray-100 bg-white">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      이름
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      표시 이름
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      학습 문장 수
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      Fallback
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((it) => (
                    <tr
                      key={it.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        alert(
                          `인텐트 상세/수정 모달 TODO (mock): ${it.displayName}`
                        );
                      }}
                    >
                      <td className="border-t border-gray-100 px-3 py-2 font-mono text-[11px] text-gray-800">
                        {it.name}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-800">
                        {it.displayName}
                        {it.description && (
                          <div className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">
                            {it.description}
                          </div>
                        )}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-700">
                        {it.trainingPhrases?.length ?? 0}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-700">
                        {it.isFallback ? (
                          <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                            Fallback
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between text-[11px] text-gray-600">
          <span>
            총 {items.length}개 / 페이지 {safePage} / {totalPages}
          </span>
          <div className="space-x-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-0.5 disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-0.5 disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- 엔티티 탭 ----------------- */

function EntityListView({
  items,
  page,
  pageSize,
  onPageChange,
}: {
  items: KnowledgeEntity[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const paged = items.slice(start, end);

  useEffect(() => {
    onPageChange(1);
  }, [items, onPageChange]);

  return (
    <div className="flex h-full flex-col">
      {/* 상단 툴바 */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="text-xs font-medium text-gray-700">
          엔티티 ({items.length})
        </div>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700"
          onClick={() => {
            alert("엔티티 추가 모달 TODO (현재는 mock 화면)");
          }}
        >
          엔티티 추가
        </button>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {paged.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="text-xs text-gray-500">
              아직 등록된 엔티티가 없습니다.
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              상단 &ldquo;엔티티 추가&rdquo; 버튼으로 값/패턴을
              등록해보세요.
            </p>
          </div>
        ) : (
          <div className="px-3 py-2">
            <div className="overflow-hidden border-gray-100 bg-white">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      이름
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      표시 이름
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      타입
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                      값 개수 / 패턴
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((e) => (
                    <tr
                      key={e.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        alert(
                          `엔티티 상세/수정 모달 TODO (mock): ${e.displayName}`
                        );
                      }}
                    >
                      <td className="border-t border-gray-100 px-3 py-2 font-mono text-[11px] text-gray-800">
                        {e.name}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-800">
                        {e.displayName}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-700">
                        {e.kind}
                        {e.isSystem && (
                          <span className="ml-1 inline-flex rounded-full bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                            system
                          </span>
                        )}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-700">
                        {e.kind === "regex" ? (
                          <code className="rounded bg-gray-50 px-1 py-0.5 text-[10px] text-gray-800">
                            {e.regexPattern || "-"}
                          </code>
                        ) : (
                          <span>
                            {(e.values?.length ?? 0).toLocaleString("ko-KR")}개
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between text-[11px] text-gray-600">
          <span>
            총 {items.length}개 / 페이지 {safePage} / {totalPages}
          </span>
          <div className="space-x-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-0.5 disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-0.5 disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
