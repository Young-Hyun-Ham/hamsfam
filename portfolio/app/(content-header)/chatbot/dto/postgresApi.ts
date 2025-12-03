// app/(content-header)/chatbot/dto/postgresApi.ts
"use client";

import { ChatbotDoc, ChatSession } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_CHATBOT_API_BASE ?? "/api/chatbot";

/**
 * Postgres: 세션 조회 (실시간 구독 대신 한 번만 호출)
 *
 * shortcut-menu 쪽이랑 맞추려면
 * GET /api/chatbot?userKey=... 정도로 맞춰주면 됨.
 */
export function subscribeChatbotSessions(
  userKey: string,
  onChange: (data: ChatbotDoc | null) => void
) {
  let cancelled = false;

  async function load() {
    try {
      const res = await fetch(
        `${API_BASE}/sessions?userKey=${encodeURIComponent(userKey)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!res.ok) {
        console.error("Postgres chatbot sessions load failed:", res.status);
        if (!cancelled) onChange(null);
        return;
      }
      const data = (await res.json()) as ChatbotDoc | null;
      if (!cancelled) onChange(data);
    } catch (err) {
      console.error("Postgres chatbot sessions load error:", err);
      if (!cancelled) onChange(null);
    }
  }

  load();

  // Postgres는 실시간이 아니니 unsubscribe는 단순 flag 정도만
  return () => {
    cancelled = true;
  };
}

/**
 * Postgres: 세션 저장
 *
 * POST /api/chatbot/sessions
 */
export async function saveChatbotSessions(
  userKey: string,
  sessions: ChatSession[],
  activeSessionId: string | null,
  systemPrompt: string
) {
  const payload: ChatbotDoc = {
    sessions,
    activeSessionId,
    systemPrompt,
    updatedAt: new Date().toISOString(),
  };

  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ userKey, ...payload }),
  });

  if (!res.ok) {
    console.error("Postgres chatbot sessions save failed:", res.status);
  }
}
