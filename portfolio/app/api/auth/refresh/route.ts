import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/utils/jwt";
import { db } from "@/lib/postgresql";

export async function POST(req: NextRequest) {
  try {
    const { payload } = await req.json();

    if (!payload) {
      return NextResponse.json(
        { error: "testId is required" },
        { status: 400 }
      );
    }

    // 테스트 유저가 없으면 자동 생성
    const upsert = await db.query(
      `
      INSERT INTO refresh_session (id, userId, tokenHash, expiresAt, userAgent, ip)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (userId)
      DO UPDATE SET revokedAt = now()
      RETURNING id, userId, tokenHash, expiresAt, userAgent, ip
    `,
      [payload.id, payload.userId, payload.tokenHash, payload.expiresAt, payload.userAgent, payload.ip]
    );

    const user = upsert.rows[0];
    const accessToken = signJwt({ id: user.id });

    return NextResponse.json({
      ...user,
      accessToken,
    });
  } catch (e) {
    console.error("Test login error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
