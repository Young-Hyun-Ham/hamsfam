// app/api/admin/postgres/board/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

function normalize(v: any) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  const client = await db.connect();
  try {
    const id = ctx.params.id;
    const res = await client.query(
      `
      SELECT
        id::text as id,
        category,
        title,
        content,
        tags,
        author_name as "authorName",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM admin_board_posts
      WHERE id = $1
      `,
      [id]
    );

    if (!res.rows[0]) {
      return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, row: res.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "GET failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const client = await db.connect();
  try {
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));

    const sets: string[] = [];
    const params: any[] = [];

    const setField = (sqlFrag: string, val: any) => {
      params.push(val);
      sets.push(`${sqlFrag} = $${params.length}`);
    };

    if ("category" in body) setField("category", normalize(body.category));
    if ("title" in body) setField("title", normalize(body.title));
    if ("content" in body) setField("content", (body.content ?? "").toString());
    if ("tags" in body) setField("tags", Array.isArray(body.tags) ? body.tags.map(normalize).filter(Boolean) : []);

    // updated_at
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      return NextResponse.json({ ok: false, message: "no fields to update" }, { status: 400 });
    }

    params.push(id);

    await client.query(
      `
      UPDATE admin_board_posts
      SET ${sets.join(", ")}
      WHERE id = $${params.length}
      `,
      params
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "PATCH failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  const client = await db.connect();
  try {
    const id = ctx.params.id;
    await client.query(`DELETE FROM admin_board_posts WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "DELETE failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
