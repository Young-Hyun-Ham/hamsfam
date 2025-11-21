// app/api/menus/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/postgresql';

// GET /api/menus?search=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';

  try {
    let rows;

    if (search) {
      const like = `%${search}%`;
      const result = await db.query(
        `
        SELECT id, menu_id, label, href, "order", lev, up_id,
               "created_at", "updated_at"
        FROM public.menu
        WHERE menu_id ILIKE $1 OR label ILIKE $1
        ORDER BY lev ASC, "order" ASC NULLS LAST, "created_at" ASC
        `,
        [like],
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `
        SELECT id, menu_id, label, href, "order", lev, up_id,
               "created_at", "updated_at"
        FROM public.menu
        ORDER BY lev ASC, "order" ASC NULLS LAST, "created_at" ASC
        `,
      );
      rows = result.rows;
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/menus error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/menus
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { menu_id, label, href, order, lev, up_id } = body;

    if (!menu_id || !label || typeof lev !== 'number') {
      return new NextResponse('menu_id, label, lev는 필수입니다.', { status: 400 });
    }

    const result = await db.query(
      `
      INSERT INTO public.menu (menu_id, label, href, "order", lev, up_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, menu_id, label, href, "order", lev, up_id,
                "created_at", "updated_at"
      `,
      [
        menu_id,
        label,
        href ?? null,
        typeof order === 'number' ? order : null,
        lev,
        up_id ?? null,
      ],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/menus error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
