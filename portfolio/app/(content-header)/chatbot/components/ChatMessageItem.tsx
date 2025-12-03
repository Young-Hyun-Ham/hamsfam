// app/(content-header)/chatbot/components/ChatMessageItem.tsx
"use client";

import { useState } from "react";
import { ChatMessage, ScenarioStep } from "../types";

type Props = {
  message: ChatMessage;
  onScenarioClick?: (scenarioKey: string, scenarioTitle?: string) => void;
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

    return (
      <div className="flex justify-start mb-2">
        <div className="max-w-[80%] rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 shadow">
          {/* 상단 헤더 (항상 보이는 영역) */}
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
              {/* 재실행 버튼 → 우측 패널에서 에뮬레이터 다시 실행 */}
              <button
                type="button"
                className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-[2px] text-[11px] text-emerald-700 hover:bg-emerald-100"
                onClick={() =>
                  onScenarioClick?.(message.scenarioKey!, message.scenarioTitle)
                }
              >
                재실행
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

          {/* 아래 실행 영역 (기본 숨김, 토글로 열기/닫기) */}
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
