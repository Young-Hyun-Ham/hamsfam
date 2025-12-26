// app/api/board/firebase/board/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { tokenizeForSearch, normalize, getCategoryPerm } from "../_utils";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const ref = doc(db, "board", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });

    const data = snap.data() as any;
    const perm = await getCategoryPerm(data.slug);

    return NextResponse.json({
      ok: true,
      item: {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      },
      category: perm,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const ref = doc(db, "board", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });

    const prev = snap.data() as any;
    const perm = await getCategoryPerm(prev.slug);
    if (!perm?.edit) return NextResponse.json({ ok: false, message: "edit not allowed" }, { status: 403 });

    const title = body.title !== undefined ? normalize(body.title) : prev.title;
    const content = body.content !== undefined ? normalize(body.content) : prev.content;
    const tags = body.tags !== undefined
      ? (Array.isArray(body.tags) ? body.tags.map(normalize).filter(Boolean) : [])
      : (prev.tags ?? []);
    const status = body.status === "draft" ? "draft" : (body.status === "published" ? "published" : prev.status);

    const keywords = tokenizeForSearch(title, content, tags);

    await updateDoc(ref, {
      title,
      content,
      tags,
      status,
      keywords,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const ref = doc(db, "board", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });

    const prev = snap.data() as any;
    const perm = await getCategoryPerm(prev.slug);
    if (!perm?.edit) return NextResponse.json({ ok: false, message: "delete not allowed" }, { status: 403 });

    await deleteDoc(ref);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "failed" }, { status: 500 });
  }
}