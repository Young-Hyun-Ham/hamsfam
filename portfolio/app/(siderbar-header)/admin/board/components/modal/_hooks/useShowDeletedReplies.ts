// app/(sidebar-header)/admin/board/components/modal/_hooks/useShowDeletedReplies.ts
"use client";

import { useEffect, useState } from "react";

export function useShowDeletedReplies(open: boolean) {
  const KEY = "admin:board:showDeletedReplies:v1";
  const [showDeleted, setShowDeleted] = useState(true);

  useEffect(() => {
    if (!open) return;
    try {
      const v = localStorage.getItem(KEY);
      if (v === "0") setShowDeleted(false);
      if (v === "1") setShowDeleted(true);
    } catch {}
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, showDeleted ? "1" : "0");
    } catch {}
  }, [showDeleted]);

  return { showDeleted, setShowDeleted };
}
