// app/api/menus/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/postgresql";

type ParamsContext = {
  params: Promise<{ id: string }>;
};

// GET /api/menus/:id
export async function GET(_req: NextRequest, { params }: ParamsContext) {
  const { id } = await params;

  try {
    const result = await db.query(
      `
      SELECT id, menu_id, label, href, "order", lev, up_id,
             "created_at", "updated_at"
      FROM public.menu
      WHERE id = $1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/menus/[id] error", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// PATCH /api/menus/:id
export async function PATCH(req: NextRequest, { params }: ParamsContext) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { menu_id, label, href, order, lev, up_id } = body;

    const currentRes = await db.query(
      `
      SELECT id, menu_id, label, href, "order", lev, up_id
      FROM public.menu
      WHERE id = $1
      `,
      [id],
    );

    if (currentRes.rowCount === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const current = currentRes.rows[0];

    const newMenuId = menu_id ?? current.menu_id;
    const newLabel = label ?? current.label;
    const newHref = href === undefined ? current.href : href;
    const newOrder =
      order === undefined
        ? current.order
        : order === null
        ? null
        : Number(order);
    const newLev = lev ?? current.lev;
    const newUpId = up_id === undefined ? current.up_id : up_id;

    const updateRes = await db.query(
      `
      UPDATE public.menu
      SET menu_id = $2,
          label   = $3,
          href    = $4,
          "order" = $5,
          lev     = $6,
          up_id   = $7,
          "updated_at" = NOW()
      WHERE id = $1
      RETURNING id, menu_id, label, href, "order", lev, up_id,
                "created_at", "updated_at"
      `,
      [id, newMenuId, newLabel, newHref, newOrder, newLev, newUpId],
    );

    return NextResponse.json(updateRes.rows[0]);
  } catch (err) {
    console.error("PATCH /api/menus/[id] error", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/menus/:id
export async function DELETE(_req: NextRequest, { params }: ParamsContext) {
  const { id } = await params;

  try {
    await db.query(
      `
      DELETE FROM public.menu
      WHERE id = $1
      `,
      [id],
    );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/menus/[id] error", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
