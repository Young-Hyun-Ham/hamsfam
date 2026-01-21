// app/api/board/firebase/board/replies/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";
import { normalize } from "@/lib/utils/utils";

const POSTS_COL = "board_posts";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = normalize(searchParams.get("postId") ?? "");
    if (!postId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const snap = await adminDb
      .collection(POSTS_COL)
      .doc(postId)
      .collection("replies")
      .orderBy("createdAt", "asc")
      .get();

    const items = snap.docs.map((d) => d.data());
    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("GET /api/board/firebase/board/replies error:", err);
    return NextResponse.json(
      { error: "댓글 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const postId = normalize(body.postId);
    const content = normalize(body.content);
    const authorId = body.authorId ?? null;
    const authorName = normalize(body.authorName) || "익명";

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const payload = {
      id,
      postId,
      content,
      authorId,
      authorName,
      // ✅ 나중에 “답변(대댓글)” 확장 시 사용 가능
      parentId: body.parentId ?? null,
      depth: Number(body.depth ?? 0),
      path: body.path ?? "",
      deleted: false,

      createdAt: now,
      updatedAt: now,
    };

    await adminDb
      .collection(POSTS_COL)
      .doc(postId)
      .collection("replies")
      .doc(id)
      .set(payload);

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (err) {
    console.error("POST /api/board/firebase/board/replies error:", err);
    return NextResponse.json(
      { error: "댓글 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = normalize(searchParams.get("id") ?? "");
    const postId = normalize(searchParams.get("postId") ?? "");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!postId) {
      // ✅ 서브컬렉션 구조에서는 postId 없으면 doc를 못 찾음
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    // 운영 정책: 하드 삭제 or 소프트 삭제
    // 1) 하드 삭제
    // await adminDb.collection(POSTS_COL).doc(postId).collection("replies").doc(id).delete();

    // 2) 소프트 삭제(관리자와 동일 방향)
    await adminDb
      .collection(POSTS_COL)
      .doc(postId)
      .collection("replies")
      .doc(id)
      .set(
        {
          deleted: true,
          content: "삭제된 댓글입니다.",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/board/firebase/board/replies error:", err);
    return NextResponse.json(
      { error: "댓글 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
