"use client";

import { useEffect, useMemo } from "react";
import ProjectListPanel from "./components/ProjectListPanel";
import IntentEntityTabs from "./components/IntentEntityTabs";
import useKnowledgeStore from "./store";

export default function KnowledgeAdminPage() {
  const {
    loading,
    error,
    projects,
    selectedProjectId,
    intents,
    entities,
    fetchProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
  } = useKnowledgeStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  return (
    <div className="p-6 bg-gray-50 h-full font-sans flex flex-col">
      <div className="text-sm text-gray-500 mb-4">
        Admin <span className="mx-1"> / </span>
        <span className="text-gray-800 font-semibold">지식관리</span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">지식관리</h1>
          <p className="mt-1 text-xs text-gray-500">
            이제 프로젝트 등록부터 실제 DB에 저장합니다.
          </p>
        </div>

        <div className="flex flex-1 min-h-0 bg-white rounded-md shadow-sm border border-gray-100">
          <div className="w-64 bg-gray-50/50 border-r border-gray-100">
            <ProjectListPanel
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={(id) => selectProject(id)}
              onCreateProject={(payload) => createProject(payload)}
            />
          </div>

          <div className="flex-1 min-w-0">
            <IntentEntityTabs
              project={selectedProject}
              intents={intents}
              entities={entities}
              loading={loading}
              error={error}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
