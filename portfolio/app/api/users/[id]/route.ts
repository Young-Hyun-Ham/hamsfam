// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

type Params = { params: { id: string } };

// 단건 조회
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const key = params.id;

    const result = await db.query(
      `
      SELECT
        id,
        sub,
        email,
        name,
        avatar_url,
        roles,
        provider,
        created_at
      FROM public.users
      WHERE id = $1::uuid OR sub = $1
      `,
      [key]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

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
    console.error("[GET /api/users/[id]] error:", err);
    return NextResponse.json(
      { error: "단건 조회 실패" },
      { status: 500 }
    );
  }
}

// 수정
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const key = params.id;
    const body = await req.json();

    const {
      sub,
      email,
      name,
      avatarUrl,
      roles,
      provider,
    } = body;

    const result = await db.query(
      `
      UPDATE public.users
      SET
        sub        = COALESCE($2, sub),
        email      = COALESCE($3, email),
        name       = COALESCE($4, name),
        avatar_url = COALESCE($5, avatar_url),
        roles      = COALESCE($6::jsonb, roles),
        provider   = COALESCE($7, provider)
      WHERE id = $1::uuid OR sub = $1
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
        key,
        sub ?? null,
        email ?? null,
        name ?? null,
        avatarUrl ?? null,
        roles ? JSON.stringify(roles) : null,
        provider ?? null,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "수정할 사용자가 없습니다." },
        { status: 404 }
      );
    }

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
    console.error("[PATCH /api/users/[id]] error:", err);
    return NextResponse.json(
      { error: "수정 실패" },
      { status: 500 }
    );
  }
}

// 삭제
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const key = params.id;

    await db.query(
      `
      DELETE FROM public.users
      WHERE id = $1::uuid OR sub = $1
      `,
      [key]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/users/[id]] error:", err);
    return NextResponse.json(
      { error: "삭제 실패" },
      { status: 500 }
    );
  }
}
