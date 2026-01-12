// app/(sidebar-header)/admin/knowledge/components/IntentEntityTabs.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  KnowledgeProject,
  KnowledgeIntent,
  KnowledgeEntity,
} from "../types";

import useKnowledgeStore from "../store";
import IntentModal from "./modal/IntentModal";
import EntityModal from "./modal/EntityModal";
import ConfirmDeleteModal from "./modal/ConfirmDeleteModal";
import ConfirmDeleteProjectModal from "./modal/ConfirmDeleteProjectModal";

type ActiveTab = "intents" | "entities";

type IntentEntityTabsProps = {
  project: KnowledgeProject | null;
  intents: KnowledgeIntent[];
  entities: KnowledgeEntity[];
  loading?: boolean;
  error?: string | null;
  onUpdateProject: (projectId: string, patch: Partial<KnowledgeProject>) => void;
  onDeleteProject: (projectId: string) => void | Promise<void>;
};

export default function IntentEntityTabs({
  project,
  intents,
  entities,
  loading,
  error,
  onUpdateProject,
  onDeleteProject,
}: IntentEntityTabsProps) {
  const [tab, setTab] = useState<ActiveTab>("intents");

  // pagination (기존 UI 유지)
  const [page, setPage] = useState(1);
  const pageSize = 8;
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsModal, setSettingsModal] = useState<null | "threshold" | "language">(null);

  const [tempLang, setTempLang] = useState(project?.defaultLanguage || "ko-KR");
  const [tempThreshold, setTempThreshold] = useState(
    typeof project?.intentThreshold === "number" ? project.intentThreshold : 0.75
  );

  useEffect(() => {
    setTempLang(project?.defaultLanguage || "ko-KR");
    setTempThreshold(typeof project?.intentThreshold === "number" ? project.intentThreshold : 0.75);
  }, [project?.id]);

  useEffect(() => {
    setPage(1);
  }, [tab, project?.id]);

  const items = useMemo(() => {
    return tab === "intents" ? intents : entities;
  }, [tab, intents, entities]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage]);

  // ===== store actions =====
  const {
    createIntent,
    updateIntent,
    deleteIntent,
    createEntity,
    updateEntity,
    deleteEntity,
  } = useKnowledgeStore();

  // ===== intent modal state =====
  const [intentModalOpen, setIntentModalOpen] = useState(false);
  const [intentMode, setIntentMode] = useState<"create" | "edit">("create");
  const [intentEditing, setIntentEditing] = useState<KnowledgeIntent | null>(
    null
  );

  // ===== entity modal state =====
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [entityMode, setEntityMode] = useState<"create" | "edit">("create");
  const [entityEditing, setEntityEditing] = useState<KnowledgeEntity | null>(
    null
  );

  // ===== delete confirm state =====
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"intent" | "entity">("intent");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteTitle = deleteType === "intent" ? "인텐트 삭제" : "엔티티 삭제";

  const openCreateIntent = () => {
    if (!project) return;
    setIntentMode("create");
    setIntentEditing(null);
    setIntentModalOpen(true);
  };

  const openEditIntent = (it: KnowledgeIntent) => {
    setIntentMode("edit");
    setIntentEditing(it);
    setIntentModalOpen(true);
  };

  const openCreateEntity = () => {
    if (!project) return;
    setEntityMode("create");
    setEntityEditing(null);
    setEntityModalOpen(true);
  };

  const openEditEntity = (e: KnowledgeEntity) => {
    setEntityMode("edit");
    setEntityEditing(e);
    setEntityModalOpen(true);
  };

  const openDelete = (type: "intent" | "entity", id: string) => {
    setDeleteType(type);
    setDeleteId(id);
    setDeleteOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 헤더 */}
      <div className="flex items-start justify-between border-b border-gray-100 bg-white px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              {project?.name ?? "프로젝트를 선택하세요"}
            </h2>
            {project?.id && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                프로젝트 ID: {project.id}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {project?.description ?? "좌측에서 프로젝트를 선택해 주세요."}
          </p>

          {error ? (
            <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="relative flex items-center gap-2">
          <span className="text-right text-[11px] text-gray-400">
            기본 언어: {project?.defaultLanguage || "ko-KR"}
          </span>

          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            onClick={() => {
              if (!project?.id) return;
              setSettingsOpen((v) => !v)}
            }
            aria-label="프로젝트 설정"
            title="프로젝트 설정"
          >
            {/* 간단 톱니 아이콘(SVG) */}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.2-2-3.4-2.3.5a7.7 7.7 0 0 0-1.7-1l-.3-2.3H9.1L8.8 7a7.7 7.7 0 0 0-1.7 1L4.8 7.5 2.8 10.9l2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.4 2.3-.5a7.7 7.7 0 0 0 1.7 1l.3 2.3h5.8l.3-2.3a7.7 7.7 0 0 0 1.7-1l2.3.5 2-3.4-2-1.2Z" />
            </svg>
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-md border border-gray-200 bg-white text-xs shadow-lg">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  setSettingsOpen(false);
                  setSettingsModal("threshold");
                }}
              >
                임계치 설정
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  setSettingsOpen(false);
                  setSettingsModal("language");
                }}
              >
                언어 설정
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-red-600"
                onClick={() => {
                  setSettingsOpen(false);
                  setDeleteProjectOpen(true);
                }}
              >
                프로젝트 삭제
              </button>
            </div>
          )}
        </div>
        
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-4 border-b border-gray-100 bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => setTab("intents")}
          className={`text-xs font-semibold ${
            tab === "intents"
              ? "text-indigo-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          인텐트 ({intents.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("entities")}
          className={`text-xs font-semibold ${
            tab === "entities"
              ? "text-indigo-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          엔티티 ({entities.length})
        </button>
      </div>

      {/* 상단 액션 */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
        <div className="text-xs font-semibold text-gray-700">
          {tab === "intents" ? `인텐트 (${intents.length})` : `엔티티 (${entities.length})`}
        </div>

        {tab === "intents" ? (
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            disabled={!project || loading}
            onClick={openCreateIntent}
          >
            인텐트 추가
          </button>
        ) : (
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            disabled={!project || loading}
            onClick={openCreateEntity}
          >
            엔티티 추가
          </button>
        )}
      </div>

      {/* 리스트 */}
      <div className="flex-1 min-h-0 overflow-auto bg-gray-50">
        {tab === "intents" ? (
          paged.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <p className="text-xs text-gray-500">아직 등록된 인텐트가 없습니다.</p>
              <p className="mt-1 text-[11px] text-gray-400">
                상단 “인텐트 추가” 버튼으로 학습할 의도를 등록해보세요.
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
                      <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-gray-600">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(paged as KnowledgeIntent[]).map((it) => (
                      <tr
                        key={it.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openEditIntent(it)}
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
                        <td className="border-t border-gray-100 px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-md border px-2 py-1 text-[11px] hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditIntent(it);
                              }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDelete("intent", it.id);
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : paged.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="text-xs text-gray-500">아직 등록된 엔티티가 없습니다.</p>
            <p className="mt-1 text-[11px] text-gray-400">
              상단 “엔티티 추가” 버튼으로 슬롯/값을 등록해보세요.
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
                      값 개수
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-gray-600">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(paged as KnowledgeEntity[]).map((e) => (
                    <tr
                      key={e.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openEditEntity(e)}
                    >
                      <td className="border-t border-gray-100 px-3 py-2 font-mono text-[11px] text-gray-800">
                        {e.name}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-800">
                        {e.displayName}
                        {e.description && (
                          <div className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-700">
                        {e.values?.length ?? 0}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-[11px] hover:bg-white"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              openEditEntity(e);
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              openDelete("entity", e.id);
                            }}
                          >
                            삭제
                          </button>
                        </div>
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
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-600">
          <span>
            총 {items.length}개 / 페이지 {safePage} / {totalPages}
          </span>
          <div className="space-x-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* ===== Modals ===== */}
      <IntentModal
        open={intentModalOpen}
        mode={intentMode}
        initial={intentEditing}
        onClose={() => setIntentModalOpen(false)}
        onSubmit={async (payload) => {
          if (!project) return;
          // console.log("인텐트 저장 데이터=============>", payload);
          const newPayload = {
            ...payload,
            scenarioKey: payload.selectedScenario?.id ?? null,
            scenarioTitle: payload.selectedScenario?.name ?? null,
          };
          if (intentMode === "create") {
            await createIntent(project.id, newPayload);
          } else if (intentEditing) {
            await updateIntent(project.id, intentEditing.id, newPayload);
          }
        }}
      />

      <EntityModal
        open={entityModalOpen}
        mode={entityMode}
        initial={entityEditing}
        onClose={() => setEntityModalOpen(false)}
        onSubmit={async (payload) => {
          if (!project) return;
          // console.log("엔티티 저장 데이터=============>", payload);
          if (entityMode === "create") {
            await createEntity(project.id, payload);
          } else if (entityEditing) {
            await updateEntity(project.id, entityEditing.id, payload);
          }
        }}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        title={deleteTitle}
        description="정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        loading={loading}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!project || !deleteId) return;

          if (deleteType === "intent") {
            await deleteIntent(project.id, deleteId);
          } else {
            await deleteEntity(project.id, deleteId);
          }

          setDeleteOpen(false);
        }}
      />

      <ConfirmDeleteProjectModal
        open={deleteProjectOpen}
        projectId={project?.id ?? ""}
        projectName={project?.name}
        loading={loading}
        onClose={() => setDeleteProjectOpen(false)}
        onConfirm={async (projectId) => {
          await onDeleteProject(projectId);
          setDeleteProjectOpen(false);
        }}
      />

      {settingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">
                {settingsModal === "threshold" ? "임계치 설정" : "언어 설정"}
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                onClick={() => setSettingsModal(null)}
              >
                닫기
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              {settingsModal === "threshold" ? (
                <>
                  <div className="text-[11px] text-gray-500">
                    인텐트 분류(Embedding 유사도) 매칭 최소 점수. 미만이면 Fallback으로 처리.
                  </div>
                  <label className="block text-[11px] font-medium text-gray-700">
                    Intent Threshold (0~1)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(Number(e.target.value))}
                  />
                </>
              ) : (
                <>
                  <label className="block text-[11px] font-medium text-gray-700">
                    기본 언어
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
                    value={tempLang}
                    onChange={(e) => setTempLang(e.target.value)}
                  >
                    <option value="ko-KR">ko-KR</option>
                    <option value="en-US">en-US</option>
                    <option value="ja-JP">ja-JP</option>
                    <option value="zh-CN">zh-CN</option>
                  </select>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                onClick={() => setSettingsModal(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                onClick={() => {
                  if (!project) return;

                  if (settingsModal === "threshold") {
                    onUpdateProject(project.id, { intentThreshold: tempThreshold });
                  } else {
                    onUpdateProject(project.id, { defaultLanguage: tempLang });
                  }
                  setSettingsModal(null);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
