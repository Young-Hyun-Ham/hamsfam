// app/(content-header)/chatbot/components/ChatMessageItem.tsx
"use client";

import { useState } from "react";
import { ChatMessage, ScenarioStep } from "../types";

type Props = {
  message: ChatMessage;
  onScenarioClick?: (scenarioKey: string, scenarioTitle?: string, messageId?: string) => void;
};

export default function ChatMessageItem({ message, onScenarioClick }: Props) {
  const isAssistant = message.role === "assistant";

  // === 시나리오 실행 메시지 전용 UI ==========================
  if (message.kind === "scenario" && message.scenarioKey) {
    const [open, setOpen] = useState(false);

    const title = message.scenarioTitle || "시나리오 실행";
    const steps: ScenarioStep[] = message.scenarioSteps ?? [];

    // 실행 로그 텍스트: 봇/사용자 구분해서 변환
    const detailText =
      steps.length > 0
        ? steps
            .map((s) =>
              s.role === "bot" ? `봇: ${s.text}` : `사용자: ${s.text}`,
            )
            .join("\n")
        : message.content; // 혹시 scenarioSteps 없으면 content fallback

    // 상태값: 없으면 steps 유무로 추정
    const status: "running" | "done" =
      message.scenarioStatus ??
      (steps && steps.length > 0 ? "done" : "running");
    
    const statusLabel = status === "done" ? "완료" : "진행중";
    const statusClass =
      status === "done"
        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
        : "border-amber-300 bg-amber-50 text-amber-700";

    return (
      <div className="flex justify-start mb-2">
        <div className="max-w-[80%] rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 shadow">
          {/* 상단 헤더 */}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-emerald-600">
                시나리오 실행
              </div>
              <div className="text-[12px] font-medium text-emerald-900">
                시나리오 실행: {title}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* 상태 표시 버튼 (진행중 / 완료) */}
              <button
                type="button"
                className={
                  "rounded-full border px-2 py-[2px] text-[11px] cursor-pointer " + statusClass
                }
                onClick={() =>
                  onScenarioClick?.(
                    message.scenarioKey!,
                    message.scenarioTitle,
                    message.id, // 어느 메시지인지 같이 전달
                  )
                }
              >
                {statusLabel}
              </button>

              {/* 상세 토글 버튼 */}
              <button
                type="button"
                className="rounded-full px-1.5 py-[2px] text-[11px] text-emerald-700 hover:bg-emerald-100"
                onClick={() => setOpen((v: any) => !v)}
              >
                {open ? "숨기기 ▲" : "상세 보기 ▼"}
              </button>
            </div>
          </div>

          {open && (
            <div className="mt-2 rounded-md bg-emerald-100/70 px-2 py-1.5 text-[11px] text-emerald-900 whitespace-pre-wrap">
              {detailText}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 👉 일반 LLM / 사용자 메시지
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
      </div>
    </div>
  );
}
