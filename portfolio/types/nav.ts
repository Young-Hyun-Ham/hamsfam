export type NavItem = {
  id: string;       // uuid or number to string
  label: string;    // 버튼에 보일 텍스트
  href: string;     // 이동 경로
  order?: number;   // 정렬용(옵션)
};

export type SidebarMenu = NavItem & { 
  lev: number,
  up_id?: string,
  depth?: number,
  path_ids?: string,    // 예: "admin>users>create"
  path_labels?: string, // 예: "관리자>사용자관리>등록"
};