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

    // ✅ total (slug/tag 기준으로만 정확)
    // Firestore Admin SDK에서 count aggregation 지원 시 사용
    let total = 0;
    try {
      const countSnap = await queryRef.count().get();
      total = Number(countSnap.data().count ?? 0);
    } catch (e) {
      // count() 미지원 환경이면 fallback(비추: 데이터 많으면 느림)
      const allSnap = await queryRef.get();
      total = allSnap.size;
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

    const hasMore = page * size < total;
    return NextResponse.json(
      { 
        items,
        paging: {
          page,
          size,
          total,
          hasMore,
        },
      }, { status: 200 });
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
  const { password, ...rest } = body;

  const id = randomUUID();
  const tokens = tokenizeForSearch(body.title, body.content, body.tags);
  const pw = normalize(body.password);
  const passwordHash = pw ? await hashPassword(pw) : "";
  const hasPassword = Boolean(pw);

  const payload = {
    ...rest,
    id,
    tokens,
    passwordHash,
    hasPassword,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await adminDb.collection(COL).doc(id).set(payload);
  
  // 히스토리 저장
  const historyId = randomUUID();
  const historyPayload = {
    ...rest,
    id: historyId,
    authorId: "admin",
    authorName: "관리자",
    createdAt: new Date().toISOString(),
  };
  await adminDb.collection(COL).doc(id).collection("history").doc(historyId).set(historyPayload);
  
  return NextResponse.json({ ok: true, id: id });
}
