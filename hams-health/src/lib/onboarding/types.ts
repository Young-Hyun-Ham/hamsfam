// src/lib/onboarding/types.ts
export type Dimension =
  | "personality"
  | "motivation"
  | "consistency"
  | "intensity"
  | "stimulus"
  | "meta";

export type Question = {
  id: string;
  dimension: Dimension;
  title: string;
  desc?: string;
  options: { label: string; value: string; hint?: string }[];
};

export type AnswerMap = Record<string, string>;
