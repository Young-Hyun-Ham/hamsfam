import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // 이미 menuService 등에서 쓰던 것과 동일하게

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") || "").trim();
console.log("여기야? ")
  if (!query) {
    return NextResponse.json({ items: [] });
  }

  // 🔧 여기서 컬렉션 이름/필드는 실제 스키마에 맞게 변경
  // 예: users 컬렉션에 { email, name, avatar_url } 필드가 있다고 가정
  const snap = await adminDb
    .collection("users")
    .where("searchKeywords", "array-contains", query.toLowerCase())
    .limit(20)
    .get();

  // searchKeywords 배열을 관리 안 하고 있다면:
  // - email, name 을 모두 가져와서 서버에서 includes 체크하는 방식으로 변경해도 됨

  const items = snap.docs.map((doc) => {
    const d = doc.data() as any;
    return {
      id: doc.id,
      email: d.email ?? "",
      name: d.name ?? "",
      avatar_url: d.avatar_url ?? null,
    };
  });

  return NextResponse.json({ items });
}
