// app/(sidebar-header)/admin/board/types/index.ts
export type AdminBoardCategory = "notice" | "faq" | "qna" | "general";

export type AdminBoardRow = {
  id: string;
  slug: AdminBoardCategory;
  title: string;
  content: string;
  tags?: string[];
  authorName: string;
  password?: string;
  hasPassword?: boolean;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
};

export type Paging = {
  page: number;
  size: number;
  total: number;
};

export type BoardQuery = {
  keyword: string;
  tag: string;
  slug: AdminBoardCategory | "all";
};

export type ModalState =
  | { type: null }
  | { type: "create" }
  | { type: "edit"; id: string }
  | { type: "detail"; id: string }
  | { type: "delete"; id: string };

export type ParamProps = {
    page: number;
    size: number;
    total: number;
} & BoardQuery;