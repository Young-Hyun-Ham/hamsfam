import { writable } from "svelte/store";

export type Holding = {
  code: string;     // 예: "005930"
  name: string;     // 예: "삼성전자"
  qty: number;      // 보유수량(추후 수익금 계산용)
};

export const holdings = writable<Holding[]>([
  { code: "005930", name: "삼성전자", qty: 10 },
  { code: "000660", name: "SK하이닉스", qty: 5 },
  { code: "035420", name: "NAVER", qty: 3 },
]);
