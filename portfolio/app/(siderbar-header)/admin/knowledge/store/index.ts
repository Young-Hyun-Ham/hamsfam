import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { KnowledgeProject, KnowledgeIntent, KnowledgeEntity } from "../types";
import * as backendService from "../services/backendServices";

type KnowledgeState = {
  loading: boolean;
  error: string | null;

  projects: KnowledgeProject[];
  selectedProjectId: string | null;

  intents: KnowledgeIntent[];
  entities: KnowledgeEntity[];

  // 액션
  fetchProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  createProject: (payload: Partial<KnowledgeProject>) => Promise<void>;
  saveIntent: (payload: Partial<KnowledgeIntent>) => Promise<void>;
  saveEntity: (payload: Partial<KnowledgeEntity>) => Promise<void>;
};

const useKnowledgeStore = create<KnowledgeState>()(
  devtools((set, get) => ({
    loading: false,
    error: null,

    projects: [],
    selectedProjectId: null,

    intents: [],
    entities: [],

    fetchProjects: async () => {
      set({ loading: true, error: null });
      try {
        const projects = await backendService.getProjects();
        set({ projects });
        // 최초 진입 시 첫번째 프로젝트 자동 선택
        if (!get().selectedProjectId && projects.length > 0) {
          await get().selectProject(projects[0].id);
        }
      } catch (e: any) {
        set({ error: e?.message ?? "프로젝트 조회 중 오류" });
      } finally {
        set({ loading: false });
      }
    },

    selectProject: async (projectId: string) => {
      set({ selectedProjectId: projectId, loading: true, error: null });
      try {
        const [intents, entities] = await Promise.all([
          backendService.getIntents(projectId),
          backendService.getEntities(projectId),
        ]);
        set({ intents, entities });
      } catch (e: any) {
        set({ error: e?.message ?? "프로젝트 데이터 조회 중 오류" });
      } finally {
        set({ loading: false });
      }
    },

    createProject: async (payload) => {
      await backendService.createProject(payload);
      await get().fetchProjects();
    },

    saveIntent: async (payload) => {
      if (!get().selectedProjectId) return;
      // await backendService.saveIntent({
      //   ...payload,
      //   projectId: get().selectedProjectId,
      // });
      await get().selectProject(get().selectedProjectId!);
    },

    saveEntity: async (payload) => {
      if (!get().selectedProjectId) return;
      // await backendService.saveEntity({
      //   ...payload,
      //   projectId: get().selectedProjectId,
      // });
      await get().selectProject(get().selectedProjectId!);
    },
  })),
);

export default useKnowledgeStore;
