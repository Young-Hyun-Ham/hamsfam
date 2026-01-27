// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { signJwt, verifyJwt } from "@/lib/utils/jwt";
import { db } from "@/lib/postgresql";
import { isCrossSite, setAccessTokenCookie, setRefreshTokenCookie } from "@/lib/cookies";
import { signAccessToken, signRefreshToken } from "@/lib/oauth";
import bcrypt from "bcryptjs";
import { roleTypes } from "@/types/user";

export async function POST(req: NextRequest) {
  console.log("/auth/refresh [ POST ] 호출됨.");
  try {
    const { data } = await req.json();
    // 요청 쿠키 스토어 가져오기
    const cookieStore = await cookies();
    const access_token = cookieStore.get("access_token")?.value ?? req.headers.get("Authorization");
    const refresh_token = cookieStore.get("refresh_token")?.value;

    // 토큰 검증
    const tokenAuth = verifyJwt(access_token ?? "");
    // console.log("payload 데이터 : ", payload)
    if (!tokenAuth || !tokenAuth.uid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 402 });
    }

    const jti = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: data.userId, jti });
    
    const payload = {
      id: jti,
      userId: data.userId,
      tokenHash: await bcrypt.hash(refreshToken, 10),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      userAgent: req.headers.get('user-agent') ?? undefined,
      ip: req.headers.get('x-forwarded-for') ?? undefined,
      access_token,
      refresh_token,
    };

    if (!payload) {
      return NextResponse.json(
        { error: "testId is required" },
        { status: 400 }
      );
    }

    // 테스트 유저가 없으면 자동 생성
    const upsert = await db.query(
      `
      WITH upsert AS (
        INSERT INTO refresh_session (id, user_id, token_hash, expires_at, user_agent, ip)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id, user_id)
        DO UPDATE SET 
            token_hash = EXCLUDED.token_hash,
            expires_at = EXCLUDED.expires_at,
            user_agent = EXCLUDED.user_agent,
            ip = EXCLUDED.ip,
            revoked_at = NULL
        RETURNING user_id
    )
    SELECT 
        u.id,
        u.sub,
        u.email,
        u.name,
        u.roles,
        'google' AS provider,
        u.avatar_url
    FROM users u
    JOIN upsert r ON r.user_id = u.id
    LIMIT 1;
    `,
      [payload.id, payload.userId, payload.tokenHash, payload.expiresAt, payload.userAgent, payload.ip]
    );

    const user = upsert.rows[0];
    const roles: roleTypes[] =
    Array.isArray(user.roles)
      ? user.roles.map(String)
      : (typeof user.roles === 'string'
          ? [user.roles]
          : []);
          
    // 4) 우리 JWT 발급 + 쿠키 세팅
    const accessToken = signAccessToken({
      id: user.id,
      sub: user.sub,
      email: user.email,
      username: user.name,
      roles,
      provider: user.provider,
    });

    const res = NextResponse.json({
      ...user,
      accessToken,
      refreshToken,
    });

    // cookie helper 로 쿠키 세팅
    setAccessTokenCookie(req, res, accessToken, {
      crossSite: isCrossSite(req),
      maxAgeSec: 60 * Number(process.env.JWT_EXPIRES_IN ?? 10), // 디폴트 10분
    });
    setRefreshTokenCookie(req, res, refreshToken, {
      crossSite: isCrossSite(req),
      maxAgeSec: 60 * 60 * 24 * 30, // 30d
    });

    return res;
  } catch (e) {
    console.error("Test login error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
