import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/utils/jwt";
import { db } from "@/lib/postgresql";

export async function POST(req: NextRequest) {
  try {
    const { testId } = await req.json();

    if (!testId) {
      return NextResponse.json(
        { error: "testId is required" },
        { status: 400 }
      );
    }

    const email = `${testId}@test.com`;

    // 테스트 유저가 없으면 자동 생성
    const upsert = await db.query(
      `
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, '')
      ON CONFLICT (email)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, name
    `,
      [email, `Test User (${testId})`]
    );

    const user = upsert.rows[0];

    const accessToken = signJwt({ id: user.id });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isTestUser: true,
      },
      accessToken,
    });
  } catch (e) {
    console.error("Test login error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
