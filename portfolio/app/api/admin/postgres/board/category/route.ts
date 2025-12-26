// app/api/admin/board/postgres/category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/postgresql";

function normalize(v: any) {
  return (v ?? "").toString().trim();
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, message: msg }, { status });
}

/**
 * 테이블 예시 (없으면 만들어야 함)
 * create table board_categories (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   slug text not null unique,
 *   description text,
 *   "order" int not null default 1,
 *   status text not null default 'active',
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * );
 */

/**
 * GET /api/admin/board/postgres/category?keyword=&status=all|active|inactive
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const keyword = normalize(url.searchParams.get("keyword")).toLowerCase();
    const status = normalize(url.searchParams.get("status")) || "all";

    const where: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (status !== "all") {
      where.push(`status = $${p++}`);
      params.push(status);
    }

    if (keyword) {
      where.push(`(lower(name) like $${p} or lower(slug) like $${p} or lower(coalesce(description,'')) like $${p})`);
      params.push(`%${keyword}%`);
      p++;
    }

    const sql = `
      select
        id,
        name,
        slug,
        description,
        "order" as order,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from board_categories
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by "order" asc, created_at desc
    `;

    const { rows } = await db.query(sql, params);
    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Postgres category GET failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/board/postgres/category
 * body: { name, slug, description?, order?, status? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = normalize(body?.name);
    const slug = normalize(body?.slug);
    const description = normalize(body?.description);
    const order = Number(body?.order ?? 1);
    const status = normalize(body?.status) || "active";

    if (!name) return bad("name is required");
    if (!slug) return bad("slug is required");

    const sql = `
      insert into board_categories (name, slug, description, "order", status)
      values ($1, $2, $3, $4, $5)
      returning id
    `;
    const { rows } = await db.query(sql, [
      name,
      slug,
      description || null,
      Number.isFinite(order) ? order : 1,
      status,
    ]);

    return NextResponse.json({ ok: true, id: rows?.[0]?.id });
  } catch (e: any) {
    // slug unique 충돌 등
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Postgres category POST failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/board/postgres/category
 * body: { id, patch: { name?, slug?, description?, order?, status? } }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = normalize(body?.id);
    const patch = body?.patch ?? {};
    if (!id) return bad("id is required");

    const sets: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (patch.name != null) {
      sets.push(`name = $${p++}`);
      params.push(normalize(patch.name));
    }
    if (patch.slug != null) {
      sets.push(`slug = $${p++}`);
      params.push(normalize(patch.slug));
    }
    if (patch.description != null) {
      sets.push(`description = $${p++}`);
      params.push(normalize(patch.description) || null);
    }
    if (patch.order != null) {
      sets.push(`"order" = $${p++}`);
      params.push(Number(patch.order));
    }
    if (patch.status != null) {
      sets.push(`status = $${p++}`);
      params.push(normalize(patch.status));
    }

    sets.push(`updated_at = now()`);

    if (sets.length === 1) return bad("patch is empty");

    const sql = `
      update board_categories
      set ${sets.join(", ")}
      where id = $${p}
    `;
    params.push(id);

    await db.query(sql, params);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Postgres category PATCH failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/board/postgres/category?id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = normalize(url.searchParams.get("id"));
    if (!id) return bad("id is required");

    await db.query(`delete from board_categories where id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Postgres category DELETE failed" },
      { status: 500 }
    );
  }
}
