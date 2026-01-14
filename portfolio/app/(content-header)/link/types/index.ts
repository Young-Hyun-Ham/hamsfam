// app/(content-header)/link/types/index.ts

export type TargetSite = {
  key: "health" | "naver" | "google";
  label: string;
  desc: string;
  href: string;
  isPopup?: boolean;
};