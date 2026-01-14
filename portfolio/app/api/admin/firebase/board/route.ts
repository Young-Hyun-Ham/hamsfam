// app/api/admin/firebase/board/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type BoardDoc = {
  title: string;
  content: string;
  slug: string;
  status: string;
  authorId: string;
  authorName?: string;
  hasPassword?: string | null;
  tags?: string[];
  tokens?: string[];
  createdAt: any;
  updatedAt: any;
};

const colRef = adminDb.collection("board_posts");

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalize(v: any) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    console.log("board admin route category ========> ", searchParams.get("category"));
    const category = normalize(searchParams.get("category") ?? "all"); // notice|faq|qna|general|all
    const keyword = normalize(searchParams.get("keyword") ?? "");
    const tag = normalize(searchParams.get("tag") ?? "");

    const page = clamp(Number(searchParams.get("page") ?? 1), 1, 10_000);
    const size = clamp(Number(searchParams.get("size") ?? 10), 1, 100);

    let queryRef: FirebaseFirestore.Query = colRef;

    if (category && category !== "all") {
      queryRef = queryRef.where("slug", "==", category);
    }
    if (tag) {
      queryRef = queryRef.where("tags", "array-contains", tag);
    }
    
    queryRef = queryRef
        .offset((page - 1) * size)
        .limit(size)
        .orderBy("createdAt", "desc")
    const snap = await queryRef.get();

    let items = snap.docs.map((d) => {
      const data = d.data() as BoardDoc;

      return {
        ...data,
      }
    });

    // 검색어 필터 (title / content, 소문자 포함 검색)
    if (keyword && keyword.trim()) {
      const key = keyword.trim().toLowerCase();
      items = items.filter((m) => {
        const title = (m.title ?? "").toLowerCase();
        const content = (m.content ?? "").toLowerCase();
        return title.includes(key) || content.includes(key);
      });
    }

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("GET /api/firebase/admin/board error:", err);
    return NextResponse.json(
      { error: "게시판 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
