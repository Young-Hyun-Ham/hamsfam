// app/api/board/firebase/category/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;

    const ref = doc(db, "board_categories", slug);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: { id: snap.id, ...(snap.data() as any) } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "failed" }, { status: 500 });
  }
}
