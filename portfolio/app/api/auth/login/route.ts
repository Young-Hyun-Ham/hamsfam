import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/utils/password";
import { signJwt } from "@/lib/utils/jwt";
import { db } from "@/lib/postgresql";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // DB에서 유저 조회
    const result = await db.query(
      "SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];

    // 비밀번호 검증
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const accessToken = signJwt({ id: user.id });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
      },
      accessToken,
    });
  } catch (e) {
    console.error("Login API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
