

type Menu = {
  id?: string;
  menu_id: string;
  label: string;
  href: string | null;
  order: number | null;
  lev: number;
  up_id: string | null;
  createdAt?: string;
  updatedAt?: string;
  depth?: number;                 // root=0, 자식=1, 손자=2 ...
  path_ids?: string;              // 예: "admin>users>create"
  path_labels?: string;           // 예: "관리자>사용자관리>등록"
};

type FormState = {
  id?: string;
  menu_id: string;
  label: string;
  href: string;
  order: string;
  lev: string;
  up_id: string;
};

type MenuSearchParams = {
  searchText?: string;   // menu_id 또는 label 검색어
  lev?: number | null;   // 1,2,3 레벨 필터 (없으면 전체)
};

export type {
  Menu,
  FormState,
  MenuSearchParams,
}