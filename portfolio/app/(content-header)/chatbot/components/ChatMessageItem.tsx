// app/(content-header)/chatbot/components/ChatMessageItem.tsx
"use client";

import { useState } from "react";
import { ChatMessage, ScenarioStep } from "../types";
import { resolveTemplate } from "../utils";
import useChatbotStore from "../store";

function LoadingDots({ label = "처리중" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
      {label}
      <span className="loading-dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </span>
  );
}

type Props = {
  message: ChatMessage;

  onScenarioClick?: (
    scenarioKey: string,
    scenarioTitle?: string,
    messageId?: string
  ) => void;

  onScenarioAccept?: (
    messageId: string,
    scenarioKey: string,
    scenarioTitle?: string
  ) => void;
  onScenarioReject?: (messageId: string) => void;
};

export default function ChatMessageItem({
  message,
  onScenarioClick,
  onScenarioAccept,
  onScenarioReject,
}: Props) {
  const [open, setOpen] = useState(false);
  const isAssistant = message.role === "assistant";
  
  const run = useChatbotStore((s) => s.scenarioRuns[message.id]);
  const slotSnapshot = run?.slotValues ?? {};

  if (message.kind === "scenario" && message.scenarioKey) {
    const title = message.scenarioTitle || "시나리오";
    const steps: ScenarioStep[] = message.scenarioSteps ?? [];

    const status =
      message.scenarioStatus ??
      (steps && steps.length > 0 ? "done" : "running");

    // ✅ 연계 여부를 status prefix로 확정
    const isLinked = String(status).startsWith("linked_");

    const headerLabel = isLinked ? "시나리오 연계" : "시나리오 실행";

    const statusLabel =
      status === "linked_suggest"
        ? "실행제안"
        : status === "linked_done"
        ? "완료"
        : status === "linked_canceled"
        ? "취소"
        : status === "done"
        ? "완료"
        : "진행중";

    const statusClass =
      status === "linked_suggest"
        ? "border-sky-300 bg-sky-50 text-sky-700"
        : status === "linked_done"
        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
        : status === "linked_canceled"
        ? "border-gray-300 bg-gray-50 text-gray-600"
        : status === "done"
        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
        : "border-amber-300 bg-amber-50 text-amber-700";

    const detailText =
      steps.length > 0
        ? steps
            .map((s) => {
              const rendered = resolveTemplate(s.text, slotSnapshot);
              return s.role === "bot" ? `봇: ${rendered}` : `사용자: ${rendered}`;
            })
            .join("\n")
        : message.content;

    return (
      <div className="flex justify-start mb-2">
        <div className="max-w-[80%] rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 shadow">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-emerald-600">
                {headerLabel}
              </div>
              <div className="text-[12px] font-medium text-emerald-900">
                {headerLabel}: {title}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isLinked ? (
                <button
                  type="button"
                  className={
                    "rounded-full border px-2 py-[2px] text-[11px] cursor-pointer " +
                    statusClass
                  }
                  onClick={() =>
                    onScenarioClick?.(
                      message.scenarioKey!,
                      message.scenarioTitle,
                      message.id
                    )
                  }
                >
                  {statusLabel}
                </button>
              ) : (
                <span
                  className={
                    "rounded-full border px-2 py-[2px] text-[11px] select-none " +
                    statusClass
                  }
                >
                  {statusLabel}
                </span>
              )}

              <button
                type="button"
                className="rounded-full px-1.5 py-[2px] text-[11px] text-emerald-700 hover:bg-emerald-100"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? "숨기기 ▲" : "상세 보기 ▼"}
              </button>
            </div>
          </div>

          {status === "linked_suggest" && (
            <div className="mt-2 rounded-md bg-white/70 px-2 py-2 text-[12px] text-emerald-900">
              <div className="whitespace-pre-wrap">{message.content}</div>
              {(message as any)?.meta?.loading ? (
                <div className="mt-2">
                  <LoadingDots label="처리중" />
                </div>
              ) : null}

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] text-white hover:bg-emerald-700"
                  onClick={() =>
                    onScenarioAccept?.(
                      message.id,
                      message.scenarioKey!,
                      message.scenarioTitle
                    )
                  }
                >
                  예
                </button>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50"
                  onClick={() => onScenarioReject?.(message.id)}
                >
                  아니오
                </button>
              </div>
            </div>
          )}

          {open && (
            <div className="mt-2 rounded-md bg-emerald-100/70 px-2 py-1.5 text-[11px] text-emerald-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {detailText}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isAssistant ? "flex justify-start mb-2" : "flex justify-end mb-2"}>
      <div
        className={
          isAssistant
            ? "max-w-[80%] rounded-lg bg-white px-3 py-2 text-xs text-gray-800 shadow"
            : "max-w-[80%] rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white shadow"
        }
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {/* LLM fallback/Gemini 로딩 표시 */}
        {(message as any)?.meta?.loading ? (
          <div className="mt-2">
            <LoadingDots label="처리중" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
