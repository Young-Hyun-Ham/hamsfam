// app/(sidebar-header)/admin/board/types/index.ts

import { roleTypes } from "@/types/user";

export type AdminUser = {
  id: string;
  name: string;
  roles: roleTypes[]; // ✅ string[] 이지만 roleTypes로 제한
};

export type AdminBoardCategory = "notice" | "faq" | "qna" | "general";

export type AdminBoardRow = {
  id: string;
  slug: AdminBoardCategory;
  title: string;
  content: string;
  tags?: string[];
  authorId: string;
  authorName: string;
  password?: string;
  hasPassword?: boolean;
  createdAt?: string; // ISO
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

export type BoardReply = {
  /** 댓글 고유 ID */
  id?: string;
  /** 소속 게시글 ID */
  postId: string;
  /**
   * 부모 댓글 ID
   * - 최상위 댓글이면 null
   */
  parentId: string | null;
  /**
   * 스레드 ID (최상위 댓글 ID)
   * - 최상위 댓글: id === threadId
   */
  threadId: string;
  /**
   * 트리 깊이
   * - 0: 최상위 댓글
   * - 1+: 대댓글
   */
  depth: number;
  /**
   * 정렬/트리 구성용 경로
   * 예:
   * - r_0001
   * - r_0001/0001
   * - r_0001/0001/0002
   */
  path: string;
  /** 작성자 정보 */
  authorId: string;
  authorName: string;
  /** 댓글 내용 */
  content: string;
  /** 삭제 여부 (soft delete) */
  deleted: boolean;
  /** 좋아요 수 */
  likeCount: number;
  /** 직계 답글 수 */
  replyCount: number;
  /** 생성/수정 시각 (ISO String or Timestamp) */
  createdAt?: string;
  updatedAt?: string;
};

export type ReplyCreateInput = {
  postId: string;
  content: string;
  parentId?: string | null;
};

export type ReplyingTo = null | {
  id: string;
  authorName: string;
  preview?: string; // 원 댓글 내용 요약
  depth?: number;   // depth 정보
};