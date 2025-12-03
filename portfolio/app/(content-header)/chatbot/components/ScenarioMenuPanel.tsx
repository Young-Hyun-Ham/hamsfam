// app/(content-header)/chatbot/components/ScenarioMenuPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "../utils";

// admin/chatbot-shortcut-menu 쪽 store 재사용
import useShortcutMenuStore from "@/app/(siderbar-header)/admin/chatbot-shortcut-menu/store";
import type { ShortcutMenu } from "@/app/(siderbar-header)/admin/chatbot-shortcut-menu/types/types";

type PanelId = "process" | "search" | "execution";

type PresetItem = {
  id: string;
  primary: string;
  secondary?: string;
  category: string;
  /** 선택된 시나리오 키 (react-flow 시나리오와 매핑용) */
  scenarioKey?: string | null;
};

type PanelConfig = {
  id: PanelId;
  label: string; // 칩에 표시될 이름
  items: PresetItem[];
};

type Props = {
  onSelectPreset?: (preset: PresetItem, panelId: PanelId) => void;
};

// 패널 라벨은 고정
const PANEL_LABELS: Record<PanelId, string> = {
  process: "Process Execution",
  search: "Search",
  execution: "Execution",
};

export default function ScenarioMenuPanel({ onSelectPreset }: Props) {
  const { fetchShortcutMenuList } = useShortcutMenuStore();

  // 어떤 패널이 선택됐는지
  const [activePanelId, setActivePanelId] = useState<PanelId>("process");
  // 드롭카드 열림 여부
  const [open, setOpen] = useState(false);
  // 패널 데이터 (백엔드에서 로딩)
  const [panelConfigs, setPanelConfigs] = useState<PanelConfig[]>([
    { id: "process", label: PANEL_LABELS.process, items: [] },
    { id: "search", label: PANEL_LABELS.search, items: [] },
    { id: "execution", label: PANEL_LABELS.execution, items: [] },
  ]);

  const [loading, setLoading] = useState(false);

  // group 문자열을 PanelId 로 변환
  function mapGroupToPanelId(group?: string | null): PanelId {
    const g = (group ?? "").toUpperCase();

    switch (g) {
      case "PROCESS_EXECUTION":
      case "PROCESS":
        return "process";
      case "SEARCH":
        return "search";
      case "EXECUTION":
        return "execution";
      default:
        // 이상한 값이거나 비어있으면 기본값
        return "process";
    }
  }

  // shortcut-menu 데이터 로딩
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list: ShortcutMenu[] = await fetchShortcutMenuList({});

        const grouped: Record<PanelId, PresetItem[]> = {
          process: [],
          search: [],
          execution: [],
        };

        list.forEach((m) => {
          const groupKey = mapGroupToPanelId(m.group as string | undefined);

          // 혹시라도 그룹 배열이 없으면 방어
          const bucket = grouped[groupKey];
          if (!bucket) return;
          if (!m.id) return;

          bucket.push({
            id: m.id,
            primary: m.label,
            secondary: m.description ?? undefined,
            category: m.section,
            scenarioKey: m.scenarioKey ?? null,
          });
        });

        setPanelConfigs((prev) =>
          prev.map((p) => ({
            ...p,
            items: grouped[p.id],
          })),
        );
      } catch (e) {
        console.error("shortcut-menu 로딩 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fetchShortcutMenuList]);


  const activePanel = panelConfigs.find((p) => p.id === activePanelId);
  const categories = activePanel
    ? Array.from(new Set(activePanel.items.map((i) => i.category)))
    : [];

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
        {open && activePanel && (
          <div
            className="
            absolute bottom-full mb-3 w-full max-w-xl
            rounded-3xl bg-white p-5 shadow-xl
            ring-1 ring-gray-200
          "
          >
            {loading && activePanel.items.length === 0 ? (
              <div className="text-xs text-gray-400">Loading shortcuts...</div>
            ) : activePanel.items.length === 0 ? (
              <div className="text-xs text-gray-400">
                등록된 shortcut 메뉴가 없습니다.
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* 칩 메뉴 */}
        <div className="flex flex-wrap gap-3">
          {panelConfigs.map((panel) => {
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
