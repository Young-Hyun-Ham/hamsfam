// app/api/oauth/google/callback/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies as getCookies } from 'next/headers';
import { db } from "@/lib/postgresql";
import { signAccessToken, signRefreshToken } from '@/lib/oauth';
import { isCrossSite, setAccessTokenCookie, setRefreshTokenCookie } from '@/lib/cookies';

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { roleTypes } from '@/types/user';

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

type GoogleTokenResponse = {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
  refresh_token?: string;
};

type GoogleIDPayload = JWTPayload & {
  sub: string;
  email?: string;
  name?: string;
  nonce?: string;
  // email_verified?: boolean;
  // picture?: string;
};


/**
 * @summary google callback
 * @description 구글 로그인 후 콜백 처리
 * @tag oauth
 */
export async function GET(req: Request) {
  console.log("/oauth/google/callback [ GET ] 호출됨.");
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000'}/login?err=oauth_state`
    );
  }
  // next/headers 의 cookies() 사용 (any 제거)
  const cookieStore = await getCookies();
  const savedState = cookieStore.get('g_state')?.value;
  const savedNonce = cookieStore.get('g_nonce')?.value;
  const redirectPath = cookieStore.get('post_login_redirect')?.value ?? '/main';
  const loginFlow = cookieStore.get('g_flow')?.value ?? 'redirect';

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000'}/login?err=invalid_state`
    );
  }

  // 1) 토큰 교환
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    cache: 'no-store',
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResp.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_ORIGIN}/login?err=token_exchange`
    );
  }
  const tokenJson: GoogleTokenResponse = await tokenResp.json();

  // 2) id_token 검증 (aud/iss/nonce)
  const { payload } = await jwtVerify(tokenJson.id_token, GOOGLE_JWKS, {
    audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  });
  const p = payload as GoogleIDPayload;

  if (savedNonce && p.nonce !== savedNonce) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_ORIGIN}/login?err=invalid_nonce`
    );
  }

  const sub = String(p.sub);
  const email = String(p.email ?? '');
  const name = String(p.name ?? email.split('@')[0] ?? 'user');

  // 3) 사용자 upsert (스키마에 맞게 조정)
  let users: any = await db.query(
      "SELECT id, sub, email, name, roles, 'google' as provider, avatar_url FROM users WHERE email = $1 limit 1;",
      [email]
    );
  const user = users.rows[0] ?? {};
  if (!user || Object.keys(user).length === 0) {
    throw new Error('유저 정보가 없습니다.');
  }

  const roles: roleTypes[] =
  Array.isArray(user.roles)
    ? user.roles.map(String)
    : (typeof user.roles === 'string'
        ? [user.roles]
        : []);
        
  // 4) 우리 JWT 발급 + 쿠키 세팅
  const access = signAccessToken({
    id: user.id,
    sub: user.sub,
    email: user.email,
    username: user.name,
    roles,
    provider: user.provider,
  });
  const jti = crypto.randomUUID();
  const refresh = signRefreshToken({ sub: user.id, jti });

  // refresh token 은 DB 저장 (로그아웃/세션관리 용이)
  const result = await db.query(
    `
      INSERT INTO refresh_session (user_id, token_hash, expires_at, user_agent, ip)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `,
    [
      user.id, 
      await bcrypt.hash(refresh, 10), 
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      req.headers.get('user-agent') ?? undefined,
      req.headers.get('x-forwarded-for') ?? undefined,
    ]
  );

  const origin = process.env.NEXT_PUBLIC_ORIGIN ?? "http://localhost:3000";

  // 5) popup/redirect 방식 분기
  let res: NextResponse;

  if (loginFlow === "popup") {
    // -------------------------------
    // 팝업 로그인: 부모창으로 postMessage
    // -------------------------------
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      provider: user.provider,
      sub: user.sub,
    };

    const html = `
<!doctype html>
<html>
  <body>
    <script>
      (function() {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: "google-auth",
                accessToken: ${JSON.stringify(access)},
                refershToken: ${JSON.stringify(refresh)},
                user: ${JSON.stringify(safeUser)}
              },
              ${JSON.stringify(origin)}
            );
          }
        } catch (e) {
          console.error("postMessage error:", e);
        }
        window.close();
      })();
    </script>
  </body>
</html>
`;

    res = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

  } else {
    // -------------------------------
    // 기존 redirect 로그인
    // -------------------------------
    res = NextResponse.redirect(`${origin}${redirectPath}`);
  }
  
  // cookie helper 로 쿠키 세팅
  setAccessTokenCookie(req, res, access, {
    crossSite: isCrossSite(req),
    maxAgeSec: 60 * Number(process.env.JWT_EXPIRES_IN ?? 10), // 디폴트 10분
  });
  setRefreshTokenCookie(req, res, refresh, {
    crossSite: isCrossSite(req),
    maxAgeSec: 60 * 60 * 24 * 30, // 30d
  });

  // 일회성 쿠키 삭제
  res.cookies.set('g_state', '', { path: '/', maxAge: 0 });
  res.cookies.set('g_nonce', '', { path: '/', maxAge: 0 });
  res.cookies.set('post_login_redirect', '', { path: '/', maxAge: 0 });

  return res;
}
