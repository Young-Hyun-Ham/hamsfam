// app/(sidebar-header)/admin/chatbot-shortcut-menu/components/ShortcutMenuModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import * as backendService from '@/app/(content-header)/builder/services/backendService';

import { FormState, ShortcutGroup } from "../../types/types";
import { ChevronDown } from "lucide-react";

type Props = {
  isOpen: boolean;
  isEditing: boolean;
  form: FormState;
  loading: boolean;
  onClose: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const groupOptions: { label: string; value: ShortcutGroup }[] = [
  { label: "Process Execution", value: "PROCESS_EXECUTION" },
  { label: "Search", value: "SEARCH" },
  { label: "Execution", value: "EXECUTION" },
];

export default function ShortcutMenuModal({
  isOpen,
  isEditing,
  form,
  loading,
  onClose,
  onChange,
  onSubmit,
}: Props) {
  if (!isOpen) return null;
  
  const [scenarioOptions, setScenarioOptions] = useState<any[]>([]);
  const backend = process.env.NEXT_PUBLIC_BACKEND as "firebase";
  
  // 최초 로드
  useEffect(() => {
    const onload = async () => {
      try {
        setScenarioOptions(await backendService.fetchScenarios(backend));
      } catch (e: any) {
        console.error(e);
      } finally {
      }
    };
    onload();
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-800">
            {isEditing ? "바로가기 메뉴 수정" : "새 바로가기 메뉴 등록"}
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 px-4 py-4">
          {/* 1레벨 그룹 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">
              1레벨 그룹 (상단 버튼)
            </label>
            <div className="relative">
              <select
                name="group"
                value={form.group}
                onChange={onChange}
                className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
              >
                {groupOptions.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>

          {/* 2레벨 섹션 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">
              2레벨 섹션 (예: Customer Service, Logistics, General)
            </label>
            <input
              name="section"
              value={form.section}
              onChange={onChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="섹션 이름을 입력하세요"
            />
          </div>

          {/* 3레벨 라벨 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">
              3레벨 라벨 (버튼 텍스트)
            </label>
            <input
              name="label"
              value={form.label}
              onChange={onChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="예: 선박 변경"
            />
          </div>

          {/* Scenario Key */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">
              시나리오 키 / preset key
            </label>
            <div className="relative">
              <select
                name="scenarioKey"
                className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
                value={form.scenarioKey ?? ""}
                onChange={onChange}
              >
                <option value="">Select scenario</option>
                {scenarioOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">
              설명 (우측 패널 제목/설명)
            </label>
            <textarea
              name="description"
              value={form.description ?? ""}
              onChange={onChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="패널 상단에 노출할 설명 또는 도움말"
            />
          </div>

          {/* 순서 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">정렬 순서</label>
            <input
              type="number"
              name="order"
              value={form.order}
              onChange={onChange}
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="1"
            />
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "저장 중..." : isEditing ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
