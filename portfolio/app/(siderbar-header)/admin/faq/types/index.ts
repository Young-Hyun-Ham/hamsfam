// app/(siderbar-header)/admin/faq/types/index.ts
export type FaqStatus = "published" | "draft";

export type FaqCategory =
  | "general"
  | "billing"
  | "account"
  | "technical"
  | "etc";

export type AdminFaq = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  status: FaqStatus;
  order: number;
  tags: string[];
  createdAt?: string; // 퍼블리싱 단계: string으로 둠
  updatedAt?: string;
};

export type FaqListQuery = {
  keyword?: string;
  category?: FaqCategory | "all";
  status?: FaqStatus | "all";
  limit?: number;
};

export const FAQ_CATEGORIES: { key: FaqCategory; label: string }[] = [
  { key: "general", label: "일반" },
  { key: "billing", label: "결제/토큰" },
  { key: "account", label: "계정" },
  { key: "technical", label: "기술" },
  { key: "etc", label: "기타" },
];

export const FAQ_STATUSES: { key: FaqStatus; label: string }[] = [
  { key: "published", label: "발행" },
  { key: "draft", label: "임시저장" },
];