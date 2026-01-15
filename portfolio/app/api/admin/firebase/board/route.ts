// app/api/admin/firebase/board/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";
import { clamp, normalize, tokenizeForSearch } from "@/lib/utils/utils";
import { hashPassword } from "@/lib/utils/password";

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

const COL = "board_posts";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = normalize(searchParams.get("slug") ?? "all"); // notice|faq|qna|general|all
    const keyword = normalize(searchParams.get("keyword") ?? "");
    const tag = normalize(searchParams.get("tag") ?? "");

    const page = clamp(Number(searchParams.get("page") ?? 1), 1, 10_000);
    const size = clamp(Number(searchParams.get("size") ?? 10), 1, 100);

    const colRef = adminDb.collection(COL);
    let queryRef: FirebaseFirestore.Query = colRef;

    if (slug && slug !== "all") {
      queryRef = queryRef.where("slug", "==", slug);
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

export async function POST(req: Request) {
  const body = await req.json();

  const now = new Date().toISOString();
  const id = randomUUID();
  const tokens = tokenizeForSearch(body.title, body.content, body.tags);
  const pw = normalize(body.password);
  const passwordHash = pw ? await hashPassword(pw) : "";
  const hasPassword = Boolean(pw);

  const payload = {
    ...body,
    id,
    tokens,
    passwordHash,
    hasPassword,
    createdAt: now,
    updatedAt: now,
  };
  await adminDb.collection(COL).doc(id).set(payload);
  
  return NextResponse.json({ ok: true, id: id });
}
