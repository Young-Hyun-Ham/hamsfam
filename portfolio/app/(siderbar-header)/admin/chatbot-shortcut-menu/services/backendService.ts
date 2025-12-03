// app/(sidebar-header)/admin/chatbot-shortcut-menu/services/backendService.ts

import {
  ScenarioOption,
  ShortcutMenu,
  ShortcutMenuSearchParams,
} from "../types/types";

import {
  fetchShortcutMenuListFromFirebase,
  createShortcutMenuOnFirebase,
  updateShortcutMenuOnFirebase,
  deleteShortcutMenuOnFirebase,
} from "../dto/firebaseApi";

import {
  fetchShortcutMenuListFromPostgres,
  createShortcutMenuOnPostgres,
  updateShortcutMenuOnPostgres,
  deleteShortcutMenuOnPostgres,
} from "../dto/postgresApi";

type BackendType = "firebase" | "postgres";

export async function fetchShortcutMenuList(
  backend: BackendType,
  params: ShortcutMenuSearchParams = {},
): Promise<ShortcutMenu[]> {
  if (backend === "postgres") {
    return fetchShortcutMenuListFromPostgres(params);
  }
  return fetchShortcutMenuListFromFirebase(params);
}

export async function createShortcutMenu(
  backend: BackendType,
  data: ShortcutMenu,
): Promise<string> {
  if (backend === "postgres") {
    return createShortcutMenuOnPostgres(data);
  }
  return createShortcutMenuOnFirebase(data);
}

export async function updateShortcutMenu(
  backend: BackendType,
  id: string,
  data: ShortcutMenu,
): Promise<void> {
  if (backend === "postgres") {
    return updateShortcutMenuOnPostgres(id, data);
  }
  return updateShortcutMenuOnFirebase(id, data);
}

export async function deleteShortcutMenu(
  backend: BackendType,
  id: string,
): Promise<void> {
  if (backend === "postgres") {
    return deleteShortcutMenuOnPostgres(id);
  }
  return deleteShortcutMenuOnFirebase(id);
}

export function convertScenarioList(json: any[]): ScenarioOption[] {
  return json.map((s) => ({
    value: s.id,
    label: s.name,
  }));
}
