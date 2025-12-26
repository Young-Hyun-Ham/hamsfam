// app/api/board/firebase/category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  QueryConstraint,
} from "firebase/firestore";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const keyword = (url.searchParams.get("keyword") ?? "").trim();
    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

    const colRef = collection(db, "board_categories");
    const qs: QueryConstraint[] = [orderBy("order", "asc"), limit(pageSize)];

    // ✅ 간단 검색: slug/name에 대해 완전검색은 Firestore가 어려우니
    // MVP는 "nameKeywords" 같은 토큰 필드 추가 방식 추천.
    // 지금은 keyword가 있으면 slug exact match 우선만 지원(필요 시 확장)
    if (keyword) qs.unshift(where("slug", "==", keyword));

    const snap = await getDocs(query(colRef, ...qs));
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "failed" }, { status: 500 });
  }
}
