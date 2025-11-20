// app/api/auth/firebase-session/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { signAccessToken, signRefreshToken } from '@/lib/oauth';
import { isCrossSite, setAccessTokenCookie, setRefreshTokenCookie } from '@/lib/cookies';

export async function POST(req: Request) {
  const { idToken } = await req.json();

  // 1) Firebase 토큰 검증
  const decoded = await adminAuth.verifyIdToken(idToken);

  const uid = decoded.uid;
  const email = decoded.email ?? '';
  const name = decoded.name ?? email.split('@')[0] ?? 'user';

  // 2) 우리 서비스용 JWT 생성 (postgres 로그인과 동일한 payload 구조)
  const access = signAccessToken({
    uid,
    email,
    username: name,
    roles: ['user'],        // 필요 시 roles 로직 확장
    provider: 'firebase',
    provider_id: uid,
  });

  const jti = crypto.randomUUID();
  const refresh = signRefreshToken({ sub: uid, jti });

  // 3) 쿠키 세팅 (콜백 로직과 동일한 헬퍼 사용)
  const res = NextResponse.json({ ok: true });

  setAccessTokenCookie(req, res, access, {
    crossSite: isCrossSite(req),
    maxAgeSec: 60 * Number(process.env.JWT_EXPIRES_IN ?? 10),
  });
  setRefreshTokenCookie(req, res, refresh, {
    crossSite: isCrossSite(req),
    maxAgeSec: 60 * 60 * 24 * 30,
  });

  return res;
}
