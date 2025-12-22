// app/api/board/postgres/faq/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

/**
 * cursor 포맷: `${order}:${uuid}`
 */
function parseCursor(cursor: string | null) {
  if (!cursor) return null;
  const idx = cursor.indexOf(":");
  if (idx < 0) return null;
  const order = Number(cursor.slice(0, idx));
  const id = cursor.slice(idx + 1);
  if (!Number.isFinite(order) || !id) return null;
  return { order, id };
}
function makeCursor(order: number, id: string) {
  return `${order}:${id}`;
}

export async function GET(req: NextRequest) {
  const client = await db.connect();
  try {
    const url = new URL(req.url);

    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    const category = url.searchParams.get("category") ?? "all";

    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);
    const cursor = parseCursor(url.searchParams.get("cursor"));

    const values: any[] = [];
    const where: string[] = ["status = 'published'"]; // ✅ 사용자용: published만

    if (category !== "all") {
      values.push(category);
      where.push(`category = $${values.length}`);
    }

    if (keyword) {
      values.push(`%${keyword}%`);
      values.push(`%${keyword}%`);
      values.push(`%${keyword}%`);
      where.push(
        `(question ILIKE $${values.length - 2} OR answer ILIKE $${values.length - 1} OR array_to_string(tags,' ') ILIKE $${values.length})`
      );
    }

    // ✅ keyset pagination (order,id)
    if (cursor) {
      values.push(cursor.order);
      values.push(cursor.id);
      where.push(
        `("order" > $${values.length - 1} OR ("order" = $${values.length - 1} AND id > $${values.length}))`
      );
    }

    // ✅ hasMore 확인 위해 +1
    values.push(pageSize + 1);

    const { rows } = await client.query(
      `
      SELECT
        id,
        question,
        answer,
        category,
        "order",
        tags,
        updated_at AS "updatedAt"
      FROM faqs
      WHERE ${where.join(" AND ")}
      ORDER BY "order" ASC, id ASC
      LIMIT $${values.length}
      `,
      values
    );

    const hasMore = rows.length > pageSize;
    const items = rows.slice(0, pageSize);

    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? makeCursor(Number(last.order ?? 0), String(last.id)) : null;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "사용자 FAQ 조회 실패" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
