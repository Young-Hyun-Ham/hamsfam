
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
};
