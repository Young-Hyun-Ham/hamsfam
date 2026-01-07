// app/api/auth/me/postgres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyJwt } from "@/lib/utils/jwt";
import { db } from "@/lib/postgresql";

export async function GET(req: NextRequest) {
  try {
    // 요청 쿠키 스토어 가져오기
    const cookieStore = await cookies();
    let auth = req.headers.get("Authorization") ?? "";
    const token = cookieStore.get("access_token")?.value ?? auth.trim().replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // const token = auth.replace("Bearer ", "");
    const payload = verifyJwt(token);
    // console.log("payload 데이터 : ", payload)
    if (!payload || !payload.uid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 402 });
    }

    const result = await db.query(
      "SELECT id, email, name, avatar_url FROM users WHERE id = $1",
      [payload.uid]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result.rows[0],
      accessToken: token,
    });
  } catch (e) {
    console.error("ME API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
