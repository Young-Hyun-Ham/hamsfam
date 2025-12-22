// app/api/board/firebase/faq/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  startAfter,
  documentId,
} from "firebase/firestore";

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

function toIso(v: any) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v?.toDate && typeof v.toDate === "function") return v.toDate().toISOString();
  if (typeof v?.seconds === "number") {
    const ms = v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000);
    return new Date(ms).toISOString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    const category = url.searchParams.get("category") ?? "all";

    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);
    const cursor = parseCursor(url.searchParams.get("cursor"));

    const colRef = collection(db, "faqs");
    const qs: any[] = [];

    // ✅ 사용자용: published만
    qs.push(where("status", "==", "published"));

    if (category !== "all") {
      qs.push(where("category", "==", category));
    }

    // ✅ 정렬: order ASC + docId ASC
    qs.push(orderBy("order", "asc"));
    qs.push(orderBy(documentId(), "asc"));

    // ✅ cursor 적용
    if (cursor) qs.push(startAfter(cursor.order, cursor.id));

    // ✅ hasMore 확인 위해 +1
    qs.push(fsLimit(pageSize + 1));

    const snap = await getDocs(query(colRef, ...qs));

    let items = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });

    // ⚠️ keyword 검색은 Firestore 쿼리로 완전 지원이 어려워서 페이지 단위로 필터
    if (keyword) {
      const k = keyword.toLowerCase();
      items = items.filter((it: any) => {
        const q = (it.question ?? "").toLowerCase();
        const a = (it.answer ?? "").toLowerCase();
        const t = Array.isArray(it.tags) ? it.tags.join(" ").toLowerCase() : "";
        return q.includes(k) || a.includes(k) || t.includes(k);
      });
    }

    const hasMore = items.length > pageSize;
    const pageItems = items.slice(0, pageSize);

    const last = pageItems[pageItems.length - 1];
    const nextCursor =
      hasMore && last ? makeCursor(Number(last.order ?? 0), last.id) : null;

    return NextResponse.json({
      items: pageItems,
      nextCursor,
      hasMore,
    });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "사용자 FAQ 조회 실패" },
      { status: 500 }
    );
  }
}
