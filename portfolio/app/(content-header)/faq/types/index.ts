export type PublicFaqCategory =
  | "all"
  | "general"
  | "billing"
  | "account"
  | "technical"
  | "etc";

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  category: Exclude<PublicFaqCategory, "all">;
  tags?: string[];
  order: number;
  // 사용자 화면에서는 문자열로만 표기(서버에서 ISO로 내려주게 만들 예정)
  updatedAt?: string | null;
};

export type PublicFaqQuery = {
  keyword?: string;
  category?: PublicFaqCategory;
};

export const FAQ_CATEGORIES: { key: PublicFaqCategory; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "general", label: "일반" },
  { key: "billing", label: "결제/토큰" },
  { key: "account", label: "계정" },
  { key: "technical", label: "기술" },
  { key: "etc", label: "기타" },
];
