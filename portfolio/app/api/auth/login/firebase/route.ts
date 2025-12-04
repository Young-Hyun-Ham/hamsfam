// app/api/auth/firebase-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/utils/password";
import { isCrossSite, setAccessTokenCookie, setRefreshTokenCookie } from "@/lib/cookies";
import { signAccessToken, signRefreshToken } from "@/lib/oauth";
import bcrypt from "bcryptjs";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
console.log("Firebase Login API called with email:", email)
console.log("Firebase Login API called with password:", password)
    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
console.log("================================> 1.")

    // ================================
    // 1) Firestore users 컬렉션에서 이메일로 유저 조회
    // ================================
    const snap = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const doc = snap.docs[0];
    const data = doc.data() as any;
console.log("================================> 2.", data)

    const userId = doc.id;
    const userSub = data.sub ?? userId;
    const userEmail = data.email ?? null;
    const userName = data.name ?? null;
    const userAvatar = data.avatar_url ?? null;
    const userRoles = data.roles ?? ["guest"];
    const userProvider = data.provider ?? "firebase";

    // Firestore에 bcrypt 해시로 저장된 password
    const hashedPassword = data.password as string | undefined;
    if (!hashedPassword) {
      return NextResponse.json(
        { error: "Password not set" },
        { status: 400 }
      );
    }

    // ================================
    // 2) 비밀번호 검증 (bcrypt.compare)
    // ================================
    const isValid = await verifyPassword(password, hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
console.log("================================> 3.", isValid)

    // ================================
    // 3) Access / Refresh 토큰 생성
    // ================================
    const accessToken = signAccessToken({
      uid: userId,
      email: userEmail,
      username: userName,
      roles: userRoles,
      provider: userProvider,
      provider_id: userSub,
    });

    const jti = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: userId, jti });

    // refresh_session 컬렉션에 세션 저장
    await adminDb.collection("refresh_session").add({
      user_id: userId,
      token_hash: await bcrypt.hash(refreshToken, 10),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30d
      user_agent: req.headers.get("user-agent") ?? null,
      ip: req.headers.get("x-forwarded-for") ?? null,
      created_at: new Date(),
    });

console.log("================================> 4.", userRoles)
    // ================================
    // 4) 응답 + 쿠키 세팅
    // ================================
    const res = NextResponse.json({
      user: {
        id: userId,
        sub: userSub,
        email: userEmail,
        name: userName,
        avatar_url: userAvatar,
        roles: userRoles,
        provider: userProvider,
      },
      accessToken,
    });
console.log("================================> 5.", res)

    // Postgres 버전이랑 동일한 쿠키 전략 유지
    setAccessTokenCookie(req, res, accessToken, {
      crossSite: isCrossSite(req),
      maxAgeSec: 60 * Number(process.env.JWT_EXPIRES_IN ?? 10), // 기본 10분
    });
    setRefreshTokenCookie(req, res, refreshToken, {
      crossSite: isCrossSite(req),
      maxAgeSec: 60 * 60 * 24 * 30, // 30일
    });

    return res;
  } catch (e) {
    console.error("Firebase Login API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
