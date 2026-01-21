// app/(content-header)/board/[slug]/types/index.ts
type BoardStatus = "published" | "draft";

type BoardPost = {
  id: string;
  slug: string;          // 카테고리/게시판 slug
  title: string;
  content: string;
  tags: string[];
  status: BoardStatus;
  hasPassword?: string;
  authorName?: string;
  createdAt?: string;    // 문자열로 통일(렌더 이슈 방지)
  updatedAt?: string;
};

type BoardQuery = {
  keyword?: string;
  tag?: string;
};

type CategoryPerm = {
  slug: string;
  name?: string;
  edit: boolean;
  reply: boolean;
};

type PageInfo = {
  limit: number;
  nextCursorId: string | null;
  hasMore: boolean;
};

type CreateInput = {
  slug: string;
  title: string;
  content: string;
  password?: string;
  hasPassword?: boolean;
  authorId?: string;
  authorName?: string;
  tags: string[];
  status?: "published" | "draft";
};

type UpdatePatch = Partial<{
  title: string;
  content: string;
  tags: string[];
  password?: string;
  hasPassword?: boolean;
  status: "published" | "draft";
}>;


type BoardReply = {
  id: string;
  postId: string;
  slug?: string;
  content: string;
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;

  deleted?: boolean;
  authorId?: string | null;
};

export type {
  BoardStatus,
  BoardPost,
  BoardQuery,
  CategoryPerm,
  PageInfo,
  CreateInput,
  UpdatePatch,
  BoardReply,
};