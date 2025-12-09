// app/(content-header)/chatbot/dto/firebaseApi.ts
"use client";

import {
  doc,
  onSnapshot,
  setDoc,
  DocumentData,
  collection,
  orderBy,
  query,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChatbotDoc, ChatSession } from "../types";
import { removeUndefinedDeep } from "../utils";
import { ShortcutMenu, ShortcutMenuSearchParams } from "../types/shortcutMenu";

const COLLECTION = "chatbot";

/**
 * Firebase: 사용자별 세션 문서 구독
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
 * Firebase: 세션 / activeSessionId / systemPrompt 저장
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
  const safeDoc = removeUndefinedDeep(payload);
  await setDoc(ref, safeDoc, { merge: true });
}

// 목록 조회할 때 id 필드 덮어쓰지 않게 주의
export async function fetchShortcutMenuListFromFirebase(
  params: ShortcutMenuSearchParams = {},
): Promise<ShortcutMenu[]> {
  const colRef = collection(db, "chatbot-shortcut-menus");
  const q = query(colRef, orderBy("order", "asc"));
  const snap = await getDocs(q);

  let list: ShortcutMenu[] = snap.docs.map((d) => {
    const data = d.data() as ShortcutMenu;
    // data 안에 id 필드가 있어도 Firestore의 문서 id로 강제 통일
    const { id: _ignored, ...rest } = data;
    return { id: d.id, ...rest };
  });
  if (params.searchText) {
    const keyword = params.searchText.toLowerCase();
    list = list.filter((item) =>
      [item.section, item.label, item.scenarioKey ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  return list;
}