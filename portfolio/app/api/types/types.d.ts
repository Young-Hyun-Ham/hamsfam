// app/types/types.d.ts

// 메뉴 항목 타입
export type MenuType = {
  id: string;       // uuid or number to string
  menu_id: string; // 메뉴 그룹 ID (없으면 빈 문자열)
  label: string;    // 버튼에 보일 텍스트
  href: string;     // 이동 경로
  order?: number;   // 정렬용(옵션)
  lev: number;      // 메뉴 레벨 (1, 2, 3 ...)
  up_id?: string; // 상위 메뉴 ID (없으면 빈 문자열)
  depth?: number;                 // root=0, 자식=1, 손자=2 ...
  path_ids?: string;              // 예: "admin>users>create"
  path_labels?: string;           // 예: "관리자>사용자관리>등록"
  use_yn?: string;
};

// Google Drive 검색 옵션
export type GDriveSearchOpts = {
  pageSize?: number;        // 최종 반환 문서 수
  candidateLimit?: number;  // 폴백에서 최근 문서 후보 수(임베딩 스코어링 대상)
  sharedOnly?: boolean;     // 서비스계정에 공유된 항목만 볼지
  driveId?: string;         // 특정 공유 드라이브 한정
};


// chat stream API 관련 타입
export type Role = "system" | "user" | "assistant";
export type ChatMessage = { role: Role; content: string };
export type options = GDriveSearchOpts & { 
  mode?: string;
  model?: string;
  mcpIds?: string[];
  mcpId?: string;
};

export type ChatStreamRequest = {
  messages: ChatMessage[];
  options?: options;
};