// src/lib/onboarding/types.ts

export type Dimension =
  | "personality"
  | "motivation"
  | "consistency"
  | "intensity"
  | "stimulus"
  | "meta"
  | "profile";

export type QuestionKind = "choice" | "dob" | "multi";

export type QuestionOption = { label: string; value: string; hint?: string; thumbnail?: string; };

export type ChoiceQuestion = {
  kind?: "choice";
  id: string;
  dimension: Dimension;
  title: string;
  desc?: string;
  options: QuestionOption[];
};

export type DobQuestion = {
  kind: "dob";
  id: string;
  dimension: Dimension;
  title: string;
  desc?: string;
  minYear?: number; // 선택: 없으면 화면에서 자동 계산
  maxYear?: number; // 선택: 없으면 화면에서 자동 계산
};

export type MultiQuestion = {
  id: string;
  dimension: string;
  kind?: "multi";
  title: string;
  desc?: string;
  options?: QuestionOption[];
};

export type Question = ChoiceQuestion | DobQuestion | MultiQuestion;

// ✅ 기존 그대로 유지 (DOB도 "YYYY-MM-DD" 문자열로 저장)
export type AnswerMap = Record<string, string | string[]>;
