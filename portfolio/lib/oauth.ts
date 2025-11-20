
import * as jwt from 'jsonwebtoken';
import crypto from "crypto";
import { User } from "@/types/user";

export function randomString(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url"); // Node18+
}

const SECRET: jwt.Secret = process.env.JWT_SECRET!;

// 토큰 발급
export function signAccessToken(payload: User) {
  return jwt.sign(payload, SECRET, { expiresIn: 60 * Number(process.env.JWT_EXPIRES_IN ?? 10) });
}

export function signRefreshToken(payload: { sub: string; jti: string }) { // user id, random id
  return jwt.sign(payload, SECRET, { expiresIn: 60 * 60 * 24 * 30 }); // 30일
}

// 토큰 검증 및 페이로드 반환 (없거나 오류 시 null)
export function verifyToken(token?: string): User | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET);
    if (typeof decoded === 'string') return null;
    const { uid, email, username, provider, roles, provider_id } = decoded as jwt.JwtPayload & User;
    return { uid, email, username, roles, provider, provider_id };
  } catch {
    return null;
  }
}
