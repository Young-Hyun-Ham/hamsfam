// src/lib/server/qstashVerify.ts
import crypto from "crypto";
import { QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } from "$env/static/private";

function b64urlToBuf(s: string) {
  // base64url -> base64
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(b64, "base64");
}

function safeJson<T = any>(buf: Buffer): T {
  return JSON.parse(buf.toString("utf8"));
}

function hmacSha256(key: string, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function timingSafeEq(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type QstashJwtPayload = {
  iss?: string;
  sub?: string; // destination URL (보통 여기 들어옴)
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  // 기타 필드 있을 수 있음
  [k: string]: any;
};

export function verifyQstashRequestOrThrow(args: {
  signature: string | null;
  requestUrl: string; // event.url.href
}) {
  const { signature, requestUrl } = args;

  if (!signature) throw new Error("Missing Upstash-Signature header");

  const parts = signature.split(".");
  if (parts.length !== 3) throw new Error("Invalid Upstash-Signature (not JWT)");

  const [h, p, s] = parts;
  const signingInput = `${h}.${p}`;
  const header = safeJson(b64urlToBuf(h));
  const payload = safeJson<QstashJwtPayload>(b64urlToBuf(p));
  const sigBuf = b64urlToBuf(s);

  if (header?.alg !== "HS256") throw new Error(`Unsupported JWT alg: ${header?.alg}`);

  const keys = [QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error("QStash signing keys missing (CURRENT/NEXT)");

  const ok = keys.some((key) => timingSafeEq(hmacSha256(key, signingInput), sigBuf));
  if (!ok) throw new Error("Invalid QStash signature");

  // 시간 검증(여유 10초)
  const now = Math.floor(Date.now() / 1000);
  const leeway = 10;
  if (typeof payload.nbf === "number" && now + leeway < payload.nbf) throw new Error("JWT not active yet (nbf)");
  if (typeof payload.exp === "number" && now - leeway > payload.exp) throw new Error("JWT expired (exp)");

  // 대상 URL 검증(엄격)
  // QStash는 sub에 목적지 URL을 넣는 케이스가 많음.
  const normalize = (u: string) => u.replace(/\/+$/, "");
  const reqNorm = normalize(requestUrl.split("?")[0]); // 쿼리 제외
  const subNorm = payload.sub ? normalize(String(payload.sub).split("?")[0]) : "";

  // sub가 있으면 sub가 목적지와 일치해야 함
  if (subNorm && subNorm !== reqNorm) {
    throw new Error(`JWT sub mismatch: sub=${subNorm}, req=${reqNorm}`);
  }

  return payload;
}
