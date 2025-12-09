// app/(content-header)/chatbot/services/backendService.ts
"use client";

import { ChatbotDoc, ChatSession } from "../types";
import * as firebaseApi from "../dto/firebaseApi";
import * as fastApi from "../dto/postgresApi";
import { ShortcutMenu, ShortcutMenuSearchParams } from "../types/shortcutMenu";
import { fetchShortcutMenuListFromPostgres } from "../dto/postgresApi";
import { fetchShortcutMenuListFromFirebase } from "../dto/firebaseApi";
// import * as firebaseApi from '@/app/api/builder/firebaseApi';
// import * as fastApi from '@/app/api/builder/fastApi';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? "firebase";

const services: any = {
  firebase: firebaseApi,
  fastapi: fastApi,
};

const getService = (backend: any) => {
  const service = services[backend];
  if (!service) {
    throw new Error(`Invalid backend specified: ${backend}`);
  }
  return service;
};

/**
 * 공통 subscribe 함수
 */
export function subscribeChatbotSessions(
  userKey: string,
  onChange: (data: ChatbotDoc | null) => void
) {
  return getService(BACKEND).subscribeChatbotSessions(userKey, onChange);
}

/**
 * 공통 save 함수
 */
export async function saveChatbotSessions(
  userKey: string,
  sessions: ChatSession[],
  activeSessionId: string | null,
  systemPrompt: string
) {
  return getService(BACKEND).saveChatbotSessions(
      userKey,
      sessions,
      activeSessionId,
      systemPrompt
  );
}

export async function fetchShortcutMenuList(
  params: ShortcutMenuSearchParams = {},
): Promise<ShortcutMenu[]> {
  if (BACKEND === "postgres") {
    return fetchShortcutMenuListFromPostgres(params);
  }
  return fetchShortcutMenuListFromFirebase(params);
}