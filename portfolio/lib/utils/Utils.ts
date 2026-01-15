// lib/utils/firebaseUtils.ts
import { Timestamp } from "firebase/firestore";
import { NextRequest } from "next/server";

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

export function formatDate(dateIso?: string | null) {
  if (!dateIso) return "-";
  return new Date(dateIso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function normalize(v: any) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

export function tokenizeForSearch(title: string, content: string, tags: string[]) {
  const text = `${normalize(title)} ${normalize(content)} ${(tags ?? []).join(" ")}`.toLowerCase();
  // 아주 단순 토큰화(MVP): 한글/영문/숫자 덩어리 분리
  const tokens = Array.from(
    new Set(
      text
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .slice(0, 30)
    )
  );
  return tokens;
}

export function getCurrentToken(req: NextRequest) {
  // Authorization: Bearer <uid> 같은 단순 운영이면 여기서 파싱
  const auth = normalize(req.headers.get("authorization"));
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = normalize(auth.slice(7));
    if (token) return token;
  }

  return "";
}

export function getCurrentUserId(req: NextRequest) {
  // 프로젝트에서 쓰는 방식에 맞춰 우선순위로 받기
  // - 예: useStore에서 api 요청 시 헤더로 X-User-Id 또는 Authorization 등을 붙일 수 있음
  const xUserId = normalize(req.headers.get("x-user-id"));
  if (xUserId) return xUserId;

  return "";
}