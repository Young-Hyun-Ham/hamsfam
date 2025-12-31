// app/(content-header)/chatbot/services/chatbotFirebaseService.ts
"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatMessage, ChatSession, ChatbotUserDoc } from "../types";

const ROOT = "chatbot";

export function subscribeUserDoc(
  userKey: string,
  onChange: (data: ChatbotUserDoc | null) => void,
) {
  const ref = doc(db, ROOT, userKey);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return onChange(null);
    const d = snap.data() as DocumentData;
    onChange({
      activeSessionId: (d.activeSessionId ?? null) as string | null,
      systemPrompt: (d.systemPrompt ?? "") as string,
      updatedAt: d.updatedAt as string | undefined,
    });
  });
}

export function subscribeSessions(
  userKey: string,
  onChange: (items: ChatSession[]) => void,
) {
  const col = collection(db, ROOT, userKey, "sessions");
  const q = query(col, orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: ChatSession[] = snap.docs.map((docSnap) => {
      const d = docSnap.data() as any;
      return {
        id: docSnap.id,
        title: d.title ?? "제목 없음",
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        lastMessagePreview: d.lastMessagePreview,
        lastMessageAt: d.lastMessageAt,
        messageCount: Number(d.messageCount ?? 0),
        messages: [],
      };
    });
    onChange(list);
  });
}

export function subscribeMessages(
  userKey: string,
  sessionId: string,
  onChange: (items: ChatMessage[]) => void,
) {
  const col = collection(db, ROOT, userKey, "sessions", sessionId, "messages");
  const q = query(col, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const list: ChatMessage[] = snap.docs.map((docSnap) => {
      const d = docSnap.data() as any;
      return {
        id: docSnap.id,
        role: d.role,
        content: d.content ?? "",
        createdAt: d.createdAt,
        kind: d.kind,
        scenarioKey: d.scenarioKey,
        scenarioTitle: d.scenarioTitle,
        scenarioStatus: d.scenarioStatus,
        scenarioSteps: d.scenarioSteps ?? [],
      };
    });
    onChange(list);
  });
}
