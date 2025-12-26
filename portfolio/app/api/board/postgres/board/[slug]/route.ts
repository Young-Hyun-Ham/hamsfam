import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;

    const { rows } = await db.query(
      `
      select
        id,
        slug,
        title,
        content,
        coalesce(tags, '{}') as tags,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from board_posts
      where slug = $1
      order by created_at desc
      limit 200
      `,
      [slug]
    );

    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "failed" },
      { status: 500 }
    );
  }
}
