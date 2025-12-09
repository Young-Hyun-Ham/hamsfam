// app/(sidebar-header)/admin/chatbot-shortcut-menu/types/types.ts

export type ShortcutGroup = 'PROCESS_EXECUTION' | 'SEARCH' | 'EXECUTION';

export interface ShortcutMenu {
  id?: string;
  group: ShortcutGroup;        // 1레벨: 상단 버튼 (Process Execution / Search / Execution)
  section: string;             // 2레벨: Customer Service, Logistics, General ...
  label: string;               // 3레벨: 선박 변경, 도착 일정 영향분석 ...
  description?: string | null; // 우측 패널 설명
  scenarioKey?: string | null; // React-Flow 시나리오 키 / preset key
  order: number | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface ScenarioOption {
  value: string;   // scenario.id
  label: string;   // scenario.name
}

export type ShortcutMenuSearchParams = {
  group?: ShortcutGroup | '';
  searchText?: string;
};

export interface FormState extends Omit<ShortcutMenu, 'order'> {
  order: string; // 입력은 문자열로, 저장 시 number로 변환
}