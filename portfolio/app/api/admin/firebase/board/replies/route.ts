// app/api/admin/firebase/board/replies/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

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
    const postId = (searchParams.get("postId") ?? "").trim();
    if (!postId) return NextResponse.json({ message: "postId is required" }, { status: 400 });

    const snap = await adminDb
      .collection(COL)
      .doc(postId)
      .collection(SUB)
      .orderBy("path", "asc")
      .get();

    const items = snap.docs.map((d) => d.data());
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ message: "failed", detail: String(e?.message ?? e) }, { status: 500 });
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
