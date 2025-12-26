// app/api/admin/board/firebase/category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";

const COL = "board_categories";

function normalize(v: any) {
  return (v ?? "").toString().trim();
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, message: msg }, { status });
}

/**
 * GET /api/admin/board/firebase/category?keyword=&status=all|active|inactive
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const keyword = normalize(url.searchParams.get("keyword")).toLowerCase();
    const status = normalize(url.searchParams.get("status")) || "all";

    const colRef = collection(db, COL);
    const qs: any[] = [orderBy("order", "asc")];

    if (status !== "all") qs.unshift(where("status", "==", status));

    const snap = await getDocs(query(colRef, ...qs));
    let items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    if (keyword) {
      items = items.filter((it: any) => {
        const hay = `${it.name ?? ""} ${it.slug ?? ""} ${it.description ?? ""}`.toLowerCase();
        return hay.includes(keyword);
      });
    }

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Firebase category GET failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/board/firebase/category
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

    const colRef = collection(db, COL);

    const docRef = await addDoc(colRef, {
      name,
      slug,
      description,
      order: Number.isFinite(order) ? order : 1,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Firebase category POST failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/board/firebase/category
 * body: { id, patch: { name?, slug?, description?, order?, status? } }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = normalize(body?.id);
    const patch = body?.patch ?? {};

    if (!id) return bad("id is required");

    const next: any = {};
    if (patch.name != null) next.name = normalize(patch.name);
    if (patch.slug != null) next.slug = normalize(patch.slug);
    if (patch.description != null) next.description = normalize(patch.description);
    if (patch.order != null) next.order = Number(patch.order);
    if (patch.status != null) next.status = normalize(patch.status);

    next.updatedAt = serverTimestamp();

    await updateDoc(doc(db, COL, id), next);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Firebase category PATCH failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/board/firebase/category?id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = normalize(url.searchParams.get("id"));
    if (!id) return bad("id is required");

    await deleteDoc(doc(db, COL, id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Firebase category DELETE failed" },
      { status: 500 }
    );
  }
}
