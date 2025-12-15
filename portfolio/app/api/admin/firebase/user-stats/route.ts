import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") || "").trim();

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const q = query.toLowerCase();

  // 일단 users 전체(or 적당한 상한) 가져와서 서버에서 includes로 필터링
  // 규모가 크면 limit 숫자만 늘리거나, email 정합 검색(where("email","==", query))로 좁혀도 됨
  const snap = await adminDb.collection("users").limit(500).get();

  const items = snap.docs
    .map((doc) => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        email: d.email ?? "",
        name: d.name ?? "",
        avatar_url: d.avatar_url ?? null,
      };
    })
    .filter((u) => {
      const email = (u.email ?? "").toLowerCase();
      const name = (u.name ?? "").toLowerCase();
      // email 이나 name 안에 query 가 포함되면 매칭
      return email.includes(q) || name.includes(q);
    });

  return NextResponse.json({ items });
}