// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";

    const result = await db.query(`
      SELECT
        id,
        sub,
        email,
        name,
        avatar_url,
        roles,
        provider,
        created_at,
        last_login_at
      FROM public.users
      ORDER BY created_at DESC
    `);

    let items = result.rows.map((u: any) => ({
      id: u.id,
      sub: u.sub,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      roles: (u.roles ?? ["guest"]) as string[],
      provider: u.provider,
      createdAt: u.created_at?.toISOString?.() ?? "",
      lastLoginAt: u.last_login_at?.toISOString?.() ?? "",
    }));

    if (keyword.trim()) {
      const k = keyword.toLowerCase();
      items = items.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(k) ||
          (u.email ?? "").toLowerCase().includes(k) ||
          (u.sub ?? "").toLowerCase().includes(k)
      );
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/users] error:", err);
    return NextResponse.json(
      { error: "사용자 목록 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id,
      sub,
      email,
      name,
      avatarUrl,
      roles,
      provider,
    } = body;

    // 이 API에서는 email/name 필수로 강제하지 않고, DDL대로 NULL 허용
    const result = await db.query(
      `
      INSERT INTO public.users (
        id,
        sub,
        email,
        name,
        avatar_url,
        roles,
        provider
      )
      VALUES (
        COALESCE($1::uuid, gen_random_uuid()),
        COALESCE($2, gen_random_uuid()::text),
        $3,
        $4,
        $5,
        COALESCE($6::jsonb, '["guest"]'::jsonb),
        $7
      )
      ON CONFLICT (id)
      DO UPDATE SET
        sub        = EXCLUDED.sub,
        email      = EXCLUDED.email,
        name       = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        roles      = EXCLUDED.roles,
        provider   = EXCLUDED.provider
      RETURNING
        id,
        sub,
        email,
        name,
        avatar_url,
        roles,
        provider,
        created_at
      `,
      [
        id ?? null,
        sub ?? null,
        email ?? null,
        name ?? null,
        avatarUrl ?? null,
        roles ? JSON.stringify(roles) : null,
        provider ?? null,
      ]
    );

    const u = result.rows[0];

    return NextResponse.json({
      id: u.id,
      sub: u.sub,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      roles: (u.roles ?? ["guest"]) as string[],
      provider: u.provider,
      createdAt: u.created_at?.toISOString?.() ?? "",
    });
  } catch (err) {
    console.error("[POST /api/users] error:", err);
    return NextResponse.json(
      { error: "사용자 저장 실패" },
      { status: 500 }
    );
  }
}
