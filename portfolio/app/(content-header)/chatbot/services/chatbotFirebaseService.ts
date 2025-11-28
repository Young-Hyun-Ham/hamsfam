// app/(content-header)/chatbot/services/chatbotFirebaseService.ts
"use client";

import {
  doc,
  onSnapshot,
  setDoc,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChatSession } from "../types";

export type ChatbotDoc = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  systemPrompt: string;
  updatedAt?: string;
};

const COLLECTION = "chatbot";

/**
 * 사용자별 세션 문서 구독
 */
export function subscribeChatbotSessions(
  userKey: string,
  onChange: (data: ChatbotDoc | null) => void
) {
  const ref = doc(db, COLLECTION, userKey);

  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const data = snap.data() as DocumentData;
    onChange({
      sessions: (data.sessions || []) as ChatSession[],
      activeSessionId: (data.activeSessionId ?? null) as string | null,
      systemPrompt: (data.systemPrompt ?? "") as string,
      updatedAt: data.updatedAt as string | undefined,
    });
  });

  return unsub;
}

/**
 * 세션 / activeSessionId / systemPrompt 저장
 */
export async function saveChatbotSessions(
  userKey: string,
  sessions: ChatSession[],
  activeSessionId: string | null,
  systemPrompt: string
) {
  const ref = doc(db, COLLECTION, userKey);
  const payload: ChatbotDoc = {
    sessions,
    activeSessionId,
    systemPrompt,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, payload, { merge: true });
}
