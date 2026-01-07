import * as jwt from 'jsonwebtoken';

const SECRET: jwt.Secret = process.env.JWT_SECRET || 'dev';

export type JwtPayload = { 
  id: string;
  sub: string | null;
  email: string;
  username: string;
  roles?: string | null;
  provider?: string | null;
};

// 토큰 발급
export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: 60 * Number(process.env.JWT_EXPIRES_IN ?? 10) });
}

export function signRefreshToken(payload: { sub: string; jti: string }) { // user id, random id
  return jwt.sign(payload, SECRET, { expiresIn: 60 * 60 * 24 * 30 }); // 30일
}

// 토큰 검증 및 페이로드 반환 (없거나 오류 시 null)
export function verifyToken(token?: string): JwtPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET);
    if (typeof decoded === 'string') return null;
    const { id, sub, email, username, provider, roles } = decoded as jwt.JwtPayload & JwtPayload;
    return { id, sub, email, username, roles, provider };
  } catch {
    return null;
  }
}
