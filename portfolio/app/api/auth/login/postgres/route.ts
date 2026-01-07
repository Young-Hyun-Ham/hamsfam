// app/api/auth/login/postgres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/utils/password";
import { db } from "@/lib/postgresql";
import { isCrossSite, setAccessTokenCookie, setRefreshTokenCookie } from "@/lib/cookies";
import { signAccessToken, signRefreshToken } from "@/lib/oauth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  console.log("/auth/login/postgres [ POST ] 호출됨.");
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // DB에서 유저 조회
    const result = await db.query(
      "SELECT id, sub, email, name, password, avatar_url, roles, provider FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];

    // 비밀번호 검증
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const accessToken = signAccessToken({
      id: user.id,
      sub: user.sub,
      email: user.email,
      username: user.name,
      roles: user.roles,
      provider: user.provider,
    });
    
    const jti = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, jti });
    await db.query(
      `
        INSERT INTO refresh_session (user_id, token_hash, expires_at, user_agent, ip)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `,
      [
        user.id, 
        await bcrypt.hash(refreshToken, 10), 
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        req.headers.get('user-agent') ?? undefined,
        req.headers.get('x-forwarded-for') ?? undefined,
      ]
    );
      
    // 응답 생성 + 쿠키 세팅
    const res = NextResponse.json({
      user: {
        id: user.id,
        sub: user.sub,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        roles: user.roles,
        provider: user.provider,
      },
      accessToken: accessToken,
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
    console.error("Login API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
