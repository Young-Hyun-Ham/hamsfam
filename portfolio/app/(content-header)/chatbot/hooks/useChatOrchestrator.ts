// app/(content-header)/chatbot/hooks/useChatOrchestrator.ts
"use client";

import { useCallback } from "react";
import { readMixedTextStream } from "../utils/streamText";
import { fetchKnowledgeAnswer, getGeminiPrefix } from "../utils/knowledge";
import { sleep } from "../utils";
import type { ChatMessage } from "../types";

type PatchMessage = (sessionId: string, messageId: string, fn: (prev: ChatMessage) => ChatMessage) => void;

export function useChatOrchestrator(opts: {
  systemPrompt: string;
  textareaFocus: () => void;

  ensureSession: () => string; // 세션 없으면 만들고 sessionId 반환
  addMessage: (m: ChatMessage) => void;
  patchMessage: PatchMessage;

  onScenarioSuggest: (args: { sessionId: string; assistantId: string; ans: any }) => void;
}) {
  const {
    systemPrompt,
    textareaFocus,
    ensureSession,
    addMessage,
    patchMessage,
    onScenarioSuggest,
  } = opts;

  const send = useCallback(async (text: string) => {
    const sessionId = ensureSession();

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: `user-${now}`,
      role: "user",
      content: text,
      createdAt: new Date(now).toISOString(),
    };
    addMessage(userMessage);

    const assistantId = `assistant-${now + 1}`;
    addMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date(now + 1).toISOString(),
    });

    let showFallbackLoading = false;
    let fallbackPrefix = "";

    // 1) knowledge
    let shouldCallGemini = true;
    try {
      const ans = await fetchKnowledgeAnswer({ text, systemPrompt, mode: "plan", locale: "ko" });

      if (ans?.answer) {
        patchMessage(sessionId, assistantId, (prev) => ({
          ...prev,
          kind: "llm",
          content: ans.answer,
          meta: { ...(prev as any)?.meta, loading: false },
        }));
        textareaFocus();
        return;
      }

      const scenarioKey = String(ans?.scenario?.scenarioKey ?? "");
      const scenarioTitle = String(ans?.scenario?.scenarioTitle ?? "");
      const hasScenario = Boolean(scenarioKey);

      if (hasScenario && ans?.shouldCallGemini === false) {
        onScenarioSuggest({ sessionId, assistantId, ans });
        textareaFocus();
        return;
      }

      shouldCallGemini = Boolean(ans?.shouldCallGemini);
      if (!shouldCallGemini) shouldCallGemini = true;

      showFallbackLoading = true;
      fallbackPrefix = getGeminiPrefix(ans) || "일반 답변으로 진행합니다.\n\n";

      patchMessage(sessionId, assistantId, (prev: any) => ({
        ...prev,
        kind: "llm",
        content: fallbackPrefix,
        meta: { ...(prev?.meta ?? {}), loading: true },
      }));
    } catch {
      shouldCallGemini = true;
    }

    if (!shouldCallGemini) {
      textareaFocus();
      return;
    }

    // 2) gemini stream
    try {
      const res = await fetch("/api/chat/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, systemPrompt }),
      });
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

      if (showFallbackLoading) await sleep(200);

      let started = false;
      await readMixedTextStream(res, (delta) => {
        if (!delta) return;

        if (!started) {
          started = true;
          if (showFallbackLoading) {
            patchMessage(sessionId, assistantId, (prev: any) => ({
              ...prev,
              kind: "llm",
              content: (fallbackPrefix ?? "") + delta,
              meta: { ...(prev?.meta ?? {}), loading: false },
            }));
            return;
          }
        }

        patchMessage(sessionId, assistantId, (prev) => ({
          ...prev,
          kind: "llm",
          content: (prev.content ?? "") + delta,
        }));
      });

      if (showFallbackLoading && !started) {
        patchMessage(sessionId, assistantId, (prev: any) => ({
          ...prev,
          meta: { ...(prev?.meta ?? {}), loading: false },
        }));
      }
    } catch {
      patchMessage(sessionId, assistantId, (prev: any) => ({
        ...prev,
        meta: { ...(prev?.meta ?? {}), loading: false },
        content: "⚠️ 답변 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      }));
    } finally {
      if (showFallbackLoading) {
        patchMessage(sessionId, assistantId, (prev: any) => ({
          ...prev,
          meta: { ...(prev?.meta ?? {}), loading: false },
        }));
      }
      textareaFocus();
    }
  }, [systemPrompt, ensureSession, addMessage, patchMessage, onScenarioSuggest, textareaFocus]);

  return { send };
}
