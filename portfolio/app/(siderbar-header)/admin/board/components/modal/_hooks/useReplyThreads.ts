// app/(sidebar-header)/admin/board/components/modal/_hooks/useReplyThreads.ts
"use client";

import { useMemo } from "react";
import type { BoardReply } from "../../../types";

export type ReplyThread = {
  threadId: string;
  root: BoardReply;
  items: BoardReply[];
};

export function useReplyThreads(replies: BoardReply[]) {
  const threads = useMemo<ReplyThread[]>(() => {
    const map = new Map<string, BoardReply[]>();

    for (const r of replies) {
      const key = r.threadId || r.id || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }

    // path 기준 정렬 유지
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.path ?? "").localeCompare(b.path ?? ""));
    }

    const list = Array.from(map.entries()).map(([threadId, items]) => {
      const root = items.find((x) => x.parentId === null && x.depth === 0) ?? items[0];
      return { threadId, root, items };
    });

    // 루트 createdAt 기준 스레드 정렬(현재 코드와 동일: asc)
    list.sort((a, b) => (a.root?.createdAt ?? "").localeCompare(b.root?.createdAt ?? ""));
    return list;
  }, [replies]);

  const directReplyCountById = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of replies) {
      if (!r.parentId) continue;
      const pid = String(r.parentId);
      m.set(pid, (m.get(pid) ?? 0) + 1);
    }
    return m;
  }, [replies]);

  return { threads, directReplyCountById };
}
