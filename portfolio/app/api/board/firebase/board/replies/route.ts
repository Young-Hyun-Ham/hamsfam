// app/api/board/firebase/board/replies/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";
import { normalize } from "@/lib/utils/utils";

const COL = "board_posts";
const SUB = "replies";
const pad4 = (n: number) => String(n).padStart(4, "0");
const COUNTERS = "reply_counters";

type CreateReplyBody = {
  postId: string;
  parentId: string | null;
  content: string;
  authorId: string;
  authorName: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = normalize(searchParams.get("postId") ?? "");
    if (!postId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const snap = await adminDb
      .collection(COL)
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
    const body = (await req.json()) as Partial<CreateReplyBody>;

    const postId = (body.postId ?? "").trim();
    const content = (body.content ?? "").trim();
    const parentId = body.parentId ? String(body.parentId).trim() : null;

    const authorId = (body.authorId ?? "").trim();
    const authorName = (body.authorName ?? "").trim();

    if (!postId) return NextResponse.json({ message: "postId is required" }, { status: 400 });
    if (!content) return NextResponse.json({ message: "content is required" }, { status: 400 });
    if (!authorId) return NextResponse.json({ message: "authorId is required" }, { status: 400 });
    if (!authorName) return NextResponse.json({ message: "authorName is required" }, { status: 400 });

    const now = new Date().toISOString();
    const replyId = randomUUID();

    const postRef = adminDb.collection(COL).doc(postId);
    const replyRef = postRef.collection(SUB).doc(replyId);

    const saved = await adminDb.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) throw new Error("POST_NOT_FOUND");

      // 최상위 댓글
      if (!parentId) {
        const payload = {
          id: replyId,
          postId,
          parentId: null,
          threadId: replyId,
          depth: 0,
          path: replyId,
          authorId,
          authorName,
          content,
          deleted: false,
          likeCount: 0,
          replyCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        tx.set(replyRef, payload);

        tx.set(
          postRef,
          { replyCount: (postSnap.data()?.replyCount ?? 0) + 1, lastReplyAt: now },
          { merge: true }
        );

        return payload;
      }

      // 대댓글
      const parentRef = postRef.collection(SUB).doc(parentId);
      const parentSnap = await tx.get(parentRef);
      if (!parentSnap.exists) throw new Error("PARENT_NOT_FOUND");

      const parent = parentSnap.data() as any;

      const threadId: string = parent.threadId ?? parent.id ?? parentId;
      const depth: number = Number(parent.depth ?? 0) + 1;
      const parentPath: string = String(parent.path ?? parentId);

      // depth 제한 (0~3)
      if (depth > 3) {
        throw new Error("MAX_DEPTH_EXCEEDED");
      }

      // ✅ 카운터 문서 (parentId 기준)
      const counterRef = postRef.collection(COUNTERS).doc(parentId);
      const counterSnap = await tx.get(counterRef);

      const currentNext = Number(counterSnap.exists ? (counterSnap.data() as any).next : 1);
      const nextIdx = currentNext;          // 이번에 사용할 번호
      const newNext = currentNext + 1;      // 다음 번호로 증가

      // ✅ 카운터 업데이트(원자적)
      tx.set(
        counterRef,
        { next: newNext, updatedAt: now },
        { merge: true }
      );

      // ✅ path 생성
      const path = `${parentPath}/${pad4(nextIdx)}`;

      const payload = {
        id: replyId,
        postId,
        parentId,
        threadId,
        depth,
        path,
        authorId,
        authorName,
        content,
        deleted: false,
        likeCount: 0,
        replyCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(replyRef, payload);

      // parent 직계 replyCount 증가
      tx.set(
        parentRef,
        { replyCount: (parent.replyCount ?? 0) + 1, updatedAt: now },
        { merge: true }
      );

      // 게시글 replyCount 증가(선택)
      tx.set(
        postRef,
        { replyCount: (postSnap.data()?.replyCount ?? 0) + 1, lastReplyAt: now },
        { merge: true }
      );

      return payload;
    });

    return NextResponse.json({ ok: true, item: saved });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg === "POST_NOT_FOUND") return NextResponse.json({ message: "post not found" }, { status: 404 });
    if (msg === "PARENT_NOT_FOUND") return NextResponse.json({ message: "parent not found" }, { status: 404 });
    if (msg === "MAX_DEPTH_EXCEEDED") return NextResponse.json({ message: "max depth is 3" }, { status: 400 });
    return NextResponse.json({ message: "failed", detail: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const replyId = (body.replyId ?? "").toString();
    const postId = (body.postId ?? "").toString();
    const content = (body.content ?? "").toString().trim();

    if (!replyId || !postId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    if (!content) return NextResponse.json({ error: "empty_content" }, { status: 400 });

    // reply 단건 doc 구조에 맞춰 수정 (예: docId = replyId)
    const ref = adminDb.collection(COL).doc(replyId);

    const updatedAt = new Date().toISOString();
    await ref.set(
      {
        content,
        updatedAt,
      },
      { merge: true }
    );

    return NextResponse.json({ id: replyId, postId, content, updatedAt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
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
      .collection(COL)
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
