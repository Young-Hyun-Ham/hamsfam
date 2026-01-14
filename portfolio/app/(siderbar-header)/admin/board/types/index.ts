// app/(sidebar-header)/admin/board/types/index.ts
export type AdminBoardCategory = "notice" | "faq" | "qna" | "general";

export type AdminBoardRow = {
  id: string;
  category: AdminBoardCategory;
  title: string;
  content: string;
  tags?: string[];
  authorName: string;
  isSecret?: boolean;
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
  category: AdminBoardCategory | "all";
};
