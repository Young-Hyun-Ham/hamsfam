// app/api/admin/postgres/board/faq/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

/**
 * =========================
 * 📌 PostgreSQL DDL (주석)
 * =========================
 *
 * -- UUID 생성 확장 필요:
 * -- CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
 *
 * CREATE TABLE faqs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   question TEXT NOT NULL,
 *   answer TEXT NOT NULL,
 *   category VARCHAR(50) NOT NULL,
 *   status VARCHAR(20) NOT NULL DEFAULT 'draft',
 *   "order" INT NOT NULL DEFAULT 0,
 *   tags TEXT[] NOT NULL DEFAULT '{}',
 *   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMP NOT NULL DEFAULT NOW()
 * );
 *
 * -- keyset pagination용 인덱스
 * CREATE INDEX idx_faqs_order_id ON faqs("order", id);
 * CREATE INDEX idx_faqs_category ON faqs(category);
 * CREATE INDEX idx_faqs_status ON faqs(status);
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
    const status = url.searchParams.get("status") ?? "all";

    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);
    const cursor = parseCursor(url.searchParams.get("cursor"));

    const values: any[] = [];
    const where: string[] = ["1=1"];

    if (category !== "all") {
      values.push(category);
      where.push(`category = $${values.length}`);
    }
    if (status !== "all") {
      values.push(status);
      where.push(`status = $${values.length}`);
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

    // hasMore 확인 위해 +1
    values.push(pageSize + 1);

    const { rows } = await client.query(
      `
      SELECT
        id,
        question,
        answer,
        category,
        status,
        "order",
        tags,
        created_at AS "createdAt",
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
    const nextCursor = hasMore && last ? makeCursor(Number(last.order ?? 0), String(last.id)) : null;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 조회 실패" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await db.connect();
  try {
    const body = await req.json();
    const { question, answer, category, status, order, tags } = body;

    const { rows } = await client.query(
      `
      INSERT INTO faqs (question, answer, category, status, "order", tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id, question, answer, category, status, "order", tags,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [question, answer, category, status ?? "draft", order ?? 0, tags ?? []]
    );

    return NextResponse.json({ item: rows[0] });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 등록 실패" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PATCH(req: NextRequest) {
  const client = await db.connect();
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

    const body = await req.json();
    const keys = Object.keys(body ?? {});
    if (keys.length === 0) {
      return NextResponse.json({ message: "empty patch" }, { status: 400 });
    }

    // allowlist 권장(원하면 추가해줄게)
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const values = keys.map((k) => body[k]);

    values.push(id);

    const { rows } = await client.query(
      `
      UPDATE faqs
      SET ${sets}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING
        id, question, answer, category, status, "order", tags,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      values
    );

    return NextResponse.json({ item: rows[0] });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 수정 실패" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest) {
  const client = await db.connect();
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

    await client.query(`DELETE FROM faqs WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 삭제 실패" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
