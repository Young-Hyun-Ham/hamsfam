"use client";

import { useState } from "react";
import { cn } from "../utils";

type PanelId = "process" | "search" | "execution";

type PresetItem = {
  id: string;
  primary: string;
  secondary?: string;
  category: string;
};

type PanelConfig = {
  id: PanelId;
  label: string; // 칩에 표시될 이름
  items: PresetItem[];
};

/** 🔹 3개 패널 정의 – 여기만 수정하면 메뉴 구성이 바뀐다 */
const PANEL_CONFIGS: PanelConfig[] = [
  {
    id: "process",
    label: "Process Execution",
    items: [
      {
        id: "cs-ship-change",
        category: "Customer Service",
        primary: "선박 변경",
        secondary: "선박 변경",
      },
      {
        id: "logistics-arrival-impact",
        category: "Logistics",
        primary: "도착 일정 영향분석",
        secondary: "도착 일정 영향분석",
      },
      {
        id: "general-scenario-list",
        category: "General",
        primary: "시나리오 목록",
        secondary: "Scenario List",
      },
    ],
  },
  {
    id: "search",
    label: "Search",
    items: [
      {
        id: "search-scenario",
        category: "Scenario",
        primary: "시나리오 검색",
        secondary: "Scenario Search",
      },
      {
        id: "search-log",
        category: "Log",
        primary: "로그 메시지 검색",
        secondary: "Log Search",
      },
    ],
  },
  {
    id: "execution",
    label: "Execution",
    items: [
      {
        id: "exec-finance-impact",
        category: "Finance",
        primary: "Finance 영향도 확인",
        secondary: "Finance 영향도 확인",
      },
      {
        id: "exec-error-test",
        category: "Debug",
        primary: "오류 메시지 테스트",
        secondary: "오류 메시지 테스트",
      },
    ],
  },
];

type Props = {
  onSelectPreset?: (preset: PresetItem, panelId: PanelId) => void;
};

export default function ScenarioMenuPanel({ onSelectPreset }: Props) {
  // 어떤 패널이 선택됐는지
  const [activePanelId, setActivePanelId] = useState<PanelId>("process");
  // 드롭카드 열림 여부
  const [open, setOpen] = useState(false);

  const activePanel = PANEL_CONFIGS.find((p) => p.id === activePanelId)!;
  const categories = Array.from(
    new Set(activePanel.items.map((i) => i.category))
  );

  const handleSelect = (item: PresetItem) => {
    onSelectPreset?.(item, activePanelId);
    // 필요하면 선택 후 닫기
    // setOpen(false);
  };

  const handleClickChip = (id: PanelId) => {
    if (id === activePanelId) {
      // 같은 칩 다시 클릭 → 열림/닫힘 토글
      setOpen((v) => !v);
    } else {
      // 다른 칩 클릭 → 패널 변경 + 카드 열기
      setActivePanelId(id);
      setOpen(true);
    }
  };

  return (
    <div className="bg-white px-[20px] pt-3">
      <div className="relative max-w-4xl mx-auto">
        {/* 드롭다운 카드 */}
        {open && (
          <div className="
            absolute bottom-full mb-3 w-full max-w-xl
            rounded-3xl bg-white p-5 shadow-xl
            ring-1 ring-gray-200
          ">
            <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
              {categories.map((cat) => (
                <div key={cat}>
                  <div className="mb-2 text-xs font-semibold text-emerald-500">
                    {cat}
                  </div>
                  {activePanel.items
                    .filter((i) => i.category === cat)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="flex w-full items-baseline justify-between rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-800 hover:bg-emerald-50"
                      >
                        <span>{item.primary}</span>
                        {item.secondary && (
                          <span className="ml-2 text-[11px] text-slate-400">
                            {item.secondary}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 칩 메뉴 */}
        <div className="flex flex-wrap gap-3">
          {PANEL_CONFIGS.map((panel) => {
            const isActive = panel.id === activePanelId;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => handleClickChip(panel.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium shadow-sm border transition",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white/80 text-slate-800 border-slate-200 hover:bg-slate-50"
                )}
              >
                <span>{panel.label}</span>
                <span className="text-xs">
                  {isActive && open ? "▲" : "▼"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
