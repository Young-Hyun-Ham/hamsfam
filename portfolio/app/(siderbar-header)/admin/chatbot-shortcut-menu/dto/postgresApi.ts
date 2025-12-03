// app/(sidebar-header)/admin/chatbot-shortcut-menu/dto/postgresApi.ts
import { api } from "@/lib/axios";
import {
  ShortcutMenu,
  ShortcutMenuSearchParams,
} from "../types/types";

export async function fetchShortcutMenuListFromPostgres(
  params: ShortcutMenuSearchParams = {},
): Promise<ShortcutMenu[]> {
  const res = await api.get<ShortcutMenu[]>("/api/chatbot-shortcut-menus", {
    params,
  });
  return res.data;
}

export async function createShortcutMenuOnPostgres(
  data: ShortcutMenu,
): Promise<string> {
  const res = await api.post<{ id: string }>("/api/chatbot-shortcut-menus", data);
  return res.data.id;
}

export async function updateShortcutMenuOnPostgres(
  id: string,
  data: ShortcutMenu,
): Promise<void> {
  await api.patch(`/api/chatbot-shortcut-menus/${id}`, data);
}

export async function deleteShortcutMenuOnPostgres(id: string): Promise<void> {
  await api.delete(`/api/chatbot-shortcut-menus/${id}`);
}
