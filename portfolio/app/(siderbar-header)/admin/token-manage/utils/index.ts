// app/(siderbar-header)/admin/token-manage/utils/index.ts

// 공통 금액 포맷 함수
export function formatNumber(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return value.toLocaleString("ko-KR");
}