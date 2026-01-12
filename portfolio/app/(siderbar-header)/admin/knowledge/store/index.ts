// app/(sider-header)/admin/knowledge/store/index.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { KnowledgeProject, KnowledgeIntent, KnowledgeEntity } from "../types";
import { axiosRequestJSON } from "../utils";

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
  updateProject: (projectId: string, patch: Partial<KnowledgeProject>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  createIntent: (projectId: string, payload: Partial<KnowledgeIntent>) => Promise<void>;
  updateIntent: (projectId: string, intentId: string, payload: Partial<KnowledgeIntent>) => Promise<void>;
  deleteIntent: (projectId: string, intentId: string) => Promise<void>;

  createEntity: (projectId: string, payload: Partial<KnowledgeEntity>) => Promise<void>;
  updateEntity: (projectId: string, entityId: string, payload: Partial<KnowledgeEntity>) => Promise<void>;
  deleteEntity: (projectId: string, entityId: string) => Promise<void>;
};

// 베이스 URL (필요하면 prefix 변경)
const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? "firebase"; 
const BASE = `/api/admin/${BACKEND}/knowledge`;

/** 임베딩 관련 플래그 주입: B안에서는 create/update 시점에 needsEmbedding만 올린다. */
function withNeedsEmbedding<T extends Record<string, any>>(payload: T): T {
  return {
    ...payload,
    needsEmbedding: true,
  };
}

async function apiCreateIntent(projectId: string, payload: any) {
  return axiosRequestJSON<KnowledgeIntent>({
    method: "POST",
    url: `${BASE}/projects/${projectId}/intents`,
    data: payload,
  });
}
async function apiUpdateIntent(projectId: string, intentId: string, payload: any) {
  return axiosRequestJSON<KnowledgeIntent>({
    method: "PATCH",
    url: `${BASE}/projects/${projectId}/intents/${intentId}`,
    data: payload,
  });
}
async function apiDeleteIntent(projectId: string, intentId: string) {
  return axiosRequestJSON<{ ok: boolean }>({
    method: "DELETE",
    url: `${BASE}/projects/${projectId}/intents/${intentId}`,
  });
}

// ✅ 추가: Entity CRUD
async function apiCreateEntity(projectId: string, payload: any) {
  return axiosRequestJSON<KnowledgeEntity>({
    method: "POST",
    url: `${BASE}/projects/${projectId}/entities`,
    data: payload,
  });
}
async function apiUpdateEntity(projectId: string, entityId: string, payload: any) {
  return axiosRequestJSON<KnowledgeEntity>({
    method: "PATCH",
    url: `${BASE}/projects/${projectId}/entities/${entityId}`,
    data: payload,
  });
}
async function apiDeleteEntity(projectId: string, entityId: string) {
  return axiosRequestJSON<{ ok: boolean }>({
    method: "DELETE",
    url: `${BASE}/projects/${projectId}/entities/${entityId}`,
  });
}

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
        const data = await axiosRequestJSON<{ items: KnowledgeProject[] }>({
          method: "GET",
          url: `${BASE}/projects`,
        });

        const projects = data.items;
        set({ projects });
        // 최초 진입 시 첫번째 프로젝트 자동 선택
        // if (!get().selectedProjectId && projects.length > 0) {
        //   await get().selectProject(projects[0].id);
        // }
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
          await axiosRequestJSON<{ items: KnowledgeIntent[] }>({
            method: "GET",
            url: `${BASE}/projects/${projectId}/intents`,
          }),
            await axiosRequestJSON<{ items: KnowledgeEntity[] }>({
            method: "GET",
            url: `${BASE}/projects/${projectId}/entities`,
          })
        ]);
        set({ intents: intents.items, entities: entities.items });
      } catch (e: any) {
        set({ error: e?.message ?? "프로젝트 데이터 조회 중 오류" });
      } finally {
        set({ loading: false });
      }
    },

    createProject: async (payload) => {
      set({ loading: true, error: null });
      try {
        // ✅ 서버로 보내기 전에 기본값 보정
        const body = {
          ...payload,
          intentThreshold: 0.75, // 기본 임계치
        };

        // 예: firebase route
        const res = await fetch("/api/admin/firebase/knowledge/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("프로젝트 생성 실패");

        const created: KnowledgeProject = await res.json();

        set((state) => ({
          projects: [created, ...state.projects],
          selectedProjectId: created.id,
          loading: false,
        }));
      } catch (e: any) {
        set({ loading: false, error: e?.message ?? "createProject error" });
      }
    },

    updateProject: async (projectId, patch) => {
      set({ loading: true, error: null });
      try {
        const res = await fetch(`/api/admin/firebase/knowledge/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });

        if (!res.ok) throw new Error("프로젝트 업데이트 실패");

        const updated: KnowledgeProject = await res.json();

        set((state) => ({
          projects: state.projects.map((p) => (p.id === projectId ? updated : p)),
          loading: false,
        }));
      } catch (e: any) {
        set({ loading: false, error: e?.message ?? "updateProject error" });
      }
    },

    deleteProject: async (projectId) => {
      set({ loading: true, error: null });
      try {
        await axiosRequestJSON<{ ok: boolean }>({
          method: "DELETE",
          url: `${BASE}/projects/${projectId}`,
        });
        await get().fetchProjects();
      } catch (e: any) {
        set({ error: e?.message ?? "프로젝트 삭제 오류" });
      } finally {
        set({ loading: false });
      }
    },

    createIntent: async (projectId, payload) => {
      set({ loading: true, error: null });
      try {
        await apiCreateIntent(projectId, withNeedsEmbedding(payload as any));
        await get().selectProject(projectId);
      } catch (e: any) {
        set({ error: e?.message ?? "인텐트 생성 오류" });
      } finally {
        set({ loading: false });
      }
    },

    updateIntent: async (projectId, intentId, payload) => {
      set({ loading: true, error: null });
      try {
        await apiUpdateIntent(projectId, intentId, withNeedsEmbedding(payload as any));
        await get().selectProject(projectId);
      } catch (e: any) {
        set({ error: e?.message ?? "인텐트 수정 오류" });
      } finally {
        set({ loading: false });
      }
    },

    deleteIntent: async (projectId, intentId) => {
      set({ loading: true, error: null });
      try {
        await apiDeleteIntent(projectId, intentId);
        await get().fetchProjects();
      } catch (e: any) {
        set({ error: e?.message ?? "인텐트 삭제 오류" });
      } finally {
        set({ loading: false });
      }
    },

    createEntity: async (projectId, payload) => {
      set({ loading: true, error: null });
      try {
        await apiCreateEntity(projectId, withNeedsEmbedding(payload as any));
        await get().selectProject(projectId);
      } catch (e: any) {
        set({ error: e?.message ?? "엔티티 생성 오류" });
      } finally {
        set({ loading: false });
      }
    },

    updateEntity: async (projectId, entityId, payload) => {
      set({ loading: true, error: null });
      try {
        await apiUpdateEntity(projectId, entityId, withNeedsEmbedding(payload as any));
        await get().selectProject(projectId);
      } catch (e: any) {
        set({ error: e?.message ?? "엔티티 수정 오류" });
      } finally {
        set({ loading: false });
      }
    },

    deleteEntity: async (projectId, entityId) => {
      set({ loading: true, error: null });
      try {
        await apiDeleteEntity(projectId, entityId);
        await get().selectProject(projectId);
      } catch (e: any) {
        set({ error: e?.message ?? "엔티티 삭제 오류" });
      } finally {
        set({ loading: false });
      }
    },
  })),
);

export default useKnowledgeStore;
