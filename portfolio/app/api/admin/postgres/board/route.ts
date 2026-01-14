// app/api/admin/postgres/board/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function normalize(v: any) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const client = await db.connect();
  try {
    const sp = req.nextUrl.searchParams;

    const page = clamp(Number(sp.get("page") ?? 1), 1, 10_000);
    const size = clamp(Number(sp.get("size") ?? 10), 1, 100);
    const offset = (page - 1) * size;

    const category = normalize(sp.get("category") ?? "all");
    const keyword = normalize(sp.get("keyword") ?? "");
    const tag = normalize(sp.get("tag") ?? "");

    const where: string[] = [];
    const params: any[] = [];

    if (category !== "all") {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (tag) {
      params.push(tag);
      where.push(`$${params.length} = ANY(tags)`);
    }
    if (keyword) {
      params.push(`%${keyword}%`);
      const i = params.length;
      where.push(`(title ILIKE $${i} OR content ILIKE $${i})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // total
    const countRes = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM admin_board_posts ${whereSql}`,
      params
    );
    const total = Number(countRes.rows[0]?.count ?? "0");

    // rows
    params.push(size);
    params.push(offset);
    const rowsRes = await client.query(
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
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
      `,
      params
    );

    return NextResponse.json({
      ok: true,
      page,
      size,
      total,
      rows: rowsRes.rows,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "GET failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await db.connect();
  try {
    const body = await req.json().catch(() => ({}));

    const category = normalize(body.category || "qna");
    const title = normalize(body.title);
    const content = (body.content ?? "").toString();
    const tags = Array.isArray(body.tags) ? body.tags.map(normalize).filter(Boolean) : [];
    const authorName = normalize(body.authorName || "관리자");

    if (!title) {
      return NextResponse.json({ ok: false, message: "title is required" }, { status: 400 });
    }

    const res = await client.query<{ id: string }>(
      `
      INSERT INTO admin_board_posts (category, title, content, tags, author_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id::text as id
      `,
      [category, title, content, tags, authorName]
    );

    return NextResponse.json({ ok: true, id: res.rows[0].id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "POST failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
