import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/utils/jwt";
import { db } from "@/lib/postgresql";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.replace("Bearer ", "");
    const payload = verifyJwt(token);

    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const result = await db.query(
      "SELECT id, email, name, avatar_url FROM users WHERE id = $1",
      [payload.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (e) {
    console.error("ME API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
