// app/(sidebar-header)/admin/knowledge/components/ProjectListPanel.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  KnowledgeProject,
  KnowledgeProjectStatus,
} from "../types";

const statusLabel: Record<KnowledgeProjectStatus, string> = {
  draft: "작성중",
  active: "사용중",
  archived: "보관됨",
};

const statusClassName: Record<KnowledgeProjectStatus, string> = {
  draft: "bg-yellow-50 text-yellow-700 ring-yellow-100",
  active: "bg-green-50 text-green-700 ring-green-100",
  archived: "bg-gray-50 text-gray-500 ring-gray-100",
};

const PROJECTS_PAGE_SIZE = 6;

type ProjectListPanelProps = {
  projects: KnowledgeProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;

  onCreateProject: (payload: {
    name: string;
    description?: string;
    defaultLanguage: string;
  }) => void;
};

export default function ProjectListPanel({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: ProjectListPanelProps) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDefaultLanguage, setNewDefaultLanguage] = useState("ko-KR");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PROJECTS_PAGE_SIZE)
  );
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PROJECTS_PAGE_SIZE;
  const end = start + PROJECTS_PAGE_SIZE;
  const paged = filtered.slice(start, end);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onCreateProject({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      defaultLanguage: newDefaultLanguage,
    });

    setNewName("");
    setNewDescription("");
    setNewDefaultLanguage("ko-KR");
    setCreating(false);
    setPage(1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* 상단 헤더 */}
      <div className="bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-700">
            프로젝트 목록
          </span>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            + 새 프로젝트
          </button>
        </div>
        <div className="mt-2">
          <input
            type="text"
            placeholder="프로젝트 검색..."
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* 새 프로젝트 폼 */}
      {creating && (
        <div className="bg-gray-50 px-3 py-2 bg-white rounded-md shadow-sm border border-gray-100 border-l-0">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-gray-700">
                프로젝트 이름
              </label>
              <input
                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-gray-700">
                설명 (선택)
              </label>
              <textarea
                className="w-full resize-none rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] leading-snug text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-gray-700">
                기본 언어
              </label>
              <select
                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={newDefaultLanguage}
                onChange={(e) => setNewDefaultLanguage(e.target.value)}
              >
                <option value="ko-KR">ko-KR</option>
                <option value="en-US">en-US</option>
                <option value="ja-JP">ja-JP</option>
                <option value="zh-CN">zh-CN</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                  setNewDescription("");
                }}
                className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={!newName.trim()}
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 프로젝트 리스트 (스크롤) */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {paged.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            프로젝트가 없습니다.
            <br />
            상단 &ldquo;새 프로젝트&rdquo; 버튼으로 추가해보세요.
          </div>
        ) : (
          <ul className="space-y-1 px-2 py-2">
            {paged.map((p) => {
              const isActive = p.id === selectedProjectId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelectProject(p.id)}
                    className={[
                      "w-full rounded-md px-2 py-2 text-left transition",
                      "border border-transparent",
                      isActive
                        ? "bg-white shadow-sm border-indigo-300"
                        : "hover:bg-white hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-[13px] font-semibold text-gray-900">
                        {p.name}
                      </span>
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                          statusClassName[p.status],
                        ].join(" ")}
                      >
                        {statusLabel[p.status]}
                      </span>
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
                        {p.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      기본 언어: {p.defaultLanguage || "ko-KR"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 페이지네이션 */}
      {filtered.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between text-[11px] text-gray-600">
          <span>
            총 {filtered.length}개 / 페이지 {safePage} / {totalPages}
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
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
