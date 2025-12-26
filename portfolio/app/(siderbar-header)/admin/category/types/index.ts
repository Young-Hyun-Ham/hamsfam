// app/(sidebar-header)/admin/category/types/index.ts
export type BoardCategoryStatus = "active" | "inactive";

export type AdminBoardCategory = {
  id: string;
  name: string; // 표시명
  slug: string; // url 키 (예: notice, qna)
  description?: string;
  order: number;
  status: BoardCategoryStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type BoardCategoryQuery = {
  keyword?: string;
  status?: "all" | BoardCategoryStatus;
};
