// app/(sidebar-header)/admin/category/store/index.ts
"use client";

import { create } from "zustand";
import { api } from "@/lib/axios";
import type {
  AdminBoardCategory,
  BoardCategoryQuery,
  BoardCategoryStatus,
} from "../types";

type State = {
  items: AdminBoardCategory[];
  selectedId: string | null;

  query: BoardCategoryQuery;

  loading: boolean;
  error: string | null;

  upsertOpen: boolean;
  deleteOpen: boolean;

  // actions
  fetchCategories: () => Promise<void>;
  select: (id: string) => void;

  setQuery: (patch: Partial<BoardCategoryQuery>) => void;

  openCreate: () => void;
  openEdit: (id: string) => void;
  closeUpsert: () => void;

  openDelete: (id: string) => void;
  closeDelete: () => void;

  createCategory: (input: Omit<AdminBoardCategory, "id">) => Promise<void>;
  updateCategory: (
    id: string,
    patch: Partial<Omit<AdminBoardCategory, "id">>,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
};

function normalize(v: any) {
  return (v ?? "").toString().trim();
}

function normalizeSlug(v: string) {
  return (v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 48);
}

function getCategoryApiBase() {
  const backend = process.env.NEXT_PUBLIC_BACKEND === "postgres" ? "postgres" : "firebase";
  return `/api/admin/${backend}/board/category`;
}

export function selectFilteredCategories(
  items: AdminBoardCategory[],
  q: BoardCategoryQuery,
) {
  const keyword = (q.keyword ?? "").trim().toLowerCase();
  const status = q.status ?? "all";

  return items
    .filter((it) => {
      if (status !== "all" && it.status !== status) return false;
      if (!keyword) return true;
      const hay = `${it.name ?? ""} ${it.slug ?? ""} ${it.description ?? ""}`.toLowerCase();
      return hay.includes(keyword);
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

const useAdminBoardCategoryStore = create<State>((set, get) => ({
  items: [],
  selectedId: null,

  query: { keyword: "", status: "all" },

  loading: false,
  error: null,

  upsertOpen: false,
  deleteOpen: false,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const base = getCategoryApiBase();
      const { keyword = "", status = "all" } = get().query;

      const res = await api.get(base, {
        params: { keyword, status },
      });

      const items: AdminBoardCategory[] = res.data?.items ?? [];
      set({
        items,
        selectedId: items[0]?.id ?? null,
        loading: false,
      });
    } catch (e: any) {
      set({
        loading: false,
        error: e?.message ?? "카테고리 조회 실패",
      });
    }
  },

  select: (id) => set({ selectedId: id }),

  setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),

  openCreate: () => set({ selectedId: null, upsertOpen: true }),
  openEdit: (id) => set({ selectedId: id, upsertOpen: true }),
  closeUpsert: () => set({ upsertOpen: false }),

  openDelete: (id) => set({ selectedId: id, deleteOpen: true }),
  closeDelete: () => set({ deleteOpen: false }),

  createCategory: async (input) => {
    const base = getCategoryApiBase();

    const payload = {
      name: normalize(input.name),
      slug: normalizeSlug(input.slug || input.name),
      description: normalize(input.description),
      order: Number(input.order ?? 1),
      status: (input.status ?? "active") as BoardCategoryStatus,
    };

    if (!payload.name) throw new Error("name is required");
    if (!payload.slug) throw new Error("slug is required");

    await api.post(base, payload);
    set({ upsertOpen: false });
    await get().fetchCategories();
  },

  updateCategory: async (id, patch) => {
    const base = getCategoryApiBase();

    const nextPatch: any = {};
    if (patch.name != null) nextPatch.name = normalize(patch.name);
    if (patch.slug != null) nextPatch.slug = normalizeSlug(patch.slug);
    if (patch.description != null) nextPatch.description = normalize(patch.description);
    if (patch.order != null) nextPatch.order = Number(patch.order);
    if (patch.status != null) nextPatch.status = patch.status;

    await api.patch(base, { id, patch: nextPatch });
    set({ upsertOpen: false });
    await get().fetchCategories();
  },

  deleteCategory: async (id) => {
    const base = getCategoryApiBase();
    await api.delete(base, { params: { id } });

    set({ deleteOpen: false });
    await get().fetchCategories();
  },
}));

export default useAdminBoardCategoryStore;

export const CATEGORY_STATUSES: { key: BoardCategoryStatus; label: string }[] = [
  { key: "active", label: "활성" },
  { key: "inactive", label: "비활성" },
];
