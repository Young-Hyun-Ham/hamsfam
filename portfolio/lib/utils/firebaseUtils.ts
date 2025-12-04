// lib/utils/firebaseUtils.ts
import { Timestamp } from "firebase/firestore";

export function toDateTimeString(value: any): string | null {
  if (!value) return null;

  // 이미 문자열이면 그대로 사용 (예전에 수동으로 문자열 저장한 경우)
  if (typeof value === "string") return value;

  // Firestore Timestamp 타입 (클라이언트 SDK)
  if (value instanceof Timestamp || typeof value.toDate === "function") {
    const d = value.toDate ? value.toDate() : new Date(value.seconds * 1000);
    return formatDateTime(d);
  }

  // seconds / nanoseconds 형태
  if (typeof value.seconds === "number") {
    const ms =
      value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000);
    return formatDateTime(new Date(ms));
  }

  return null;
}

export function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}