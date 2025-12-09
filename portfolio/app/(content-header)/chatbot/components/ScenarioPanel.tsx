"use client";

import { X } from "lucide-react";
import { cn } from "../utils";

export type ScenarioPanelProps = {
  open: boolean;
  scenarioTitle?: string;
  nodeContent?: React.ReactNode; 
  status?: "running" | "done";
  onClose: () => void;
};

export default function ScenarioPanel({
  open,
  scenarioTitle = "시나리오",
  nodeContent,
  status,
  onClose,
}: ScenarioPanelProps) {
  return (
    <div
      className={`
        h-full border-l border-indigo-200/40 bg-white
        shadow-xl transition-all duration-300 ease-out
        ${open ? "w-[460px] opacity-100" : "w-0 opacity-0"}
      `}
      style={{ overflow: "hidden" }}
    >
      {/* 상단 헤더 */}
      {open && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-[2px] text-xs font-medium rounded-full",
              status === "done"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            )}>
              {status === "done" ? "완료" : "진행중"}
            </span>
            <span className="font-medium text-gray-900">{scenarioTitle}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      {open && (
        <div className="p-4 overflow-y-auto h-[calc(100%-50px)]">
          {nodeContent ? (
            nodeContent
          ) : (
            <div className="text-sm text-gray-500">
              시나리오 데이터가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
