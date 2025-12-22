// app/api/admin/firebase/board/faq/route.ts
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
  limit as fsLimit,
  startAfter,
  documentId,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

function toIso(v: any) {
  // Firestore Timestamp
  if (v && typeof v === "object" && typeof v.toDate === "function") {
    return v.toDate().toISOString();
  }
  // {seconds, nanoseconds} 형태로 올 때(드물지만 방어)
  if (v && typeof v === "object" && typeof v.seconds === "number") {
    const ms = v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000);
    return new Date(ms).toISOString();
  }
  if (typeof v === "string") return v;
  return null;
}

/**
 * cursor 포맷: `${order}:${docId}`
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
  try {
    const url = new URL(req.url);

    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    const category = url.searchParams.get("category") ?? "all";
    const status = url.searchParams.get("status") ?? "all";

    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);
    const cursor = parseCursor(url.searchParams.get("cursor"));

    const colRef = collection(db, "faqs");
    const qs: any[] = [];

    if (category !== "all") qs.push(where("category", "==", category));
    if (status !== "all") qs.push(where("status", "==", status));

    // 정렬: order ASC, docId ASC(타이브레이커)
    qs.push(orderBy("order", "asc"));
    qs.push(orderBy(documentId(), "asc"));

    // cursor 이후부터
    if (cursor) qs.push(startAfter(cursor.order, cursor.id));

    // hasMore 판단 위해 +1개 더 가져오기
    qs.push(fsLimit(pageSize + 1));

    const snap = await getDocs(query(colRef, ...qs));

    let docs = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });

    // ⚠️ Firestore는 contains 검색이 어려워서,
    // 현재는 받아온 페이지 단위에서 keyword 필터(간단 대응)
    if (keyword) {
      const k = keyword.toLowerCase();
      docs = docs.filter(
        (it) =>
          (it.question ?? "").toLowerCase().includes(k) ||
          (it.answer ?? "").toLowerCase().includes(k) ||
          (Array.isArray(it.tags) ? it.tags.join(" ").toLowerCase().includes(k) : false)
      );
    }

    const hasMore = docs.length > pageSize;
    const items = docs.slice(0, pageSize);

    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? makeCursor(Number(last.order ?? 0), last.id) : null;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const docRef = await addDoc(collection(db, "faqs"), {
      ...body,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      item: { id: docRef.id, ...body },
    });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 등록 실패" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

    const body = await req.json();

    await updateDoc(doc(db, "faqs", id), {
      ...body,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ item: { id, ...body } });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 수정 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

    await deleteDoc(doc(db, "faqs", id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "FAQ 삭제 실패" },
      { status: 500 }
    );
  }
}
