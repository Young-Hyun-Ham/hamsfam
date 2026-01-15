// app/api/board/firebase/board/replies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getCategoryPerm } from "../_utils"; // 경로는 네 board/_utils.ts 기준으로 조정
import { normalize, toDateTimeString } from "@/lib/utils/utils";

function deny(message: string, status = 403) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const postId = normalize(url.searchParams.get("postId"));
    if (!postId) return NextResponse.json({ ok: false, message: "postId is required" }, { status: 400 });

    const postSnap = await getDoc(doc(db, "board_posts", postId));
    if (!postSnap.exists()) return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });

    const post = postSnap.data() as any;
    const slug = normalize(post.slug);
    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });

    // 읽기는 허용(필요하면 perm.status로 제한)
    const snap = await getDocs(
      query(
        collection(db, "board_replies"),
        where("postId", "==", postId),
        orderBy("createdAt", "asc")
      )
    );

    // const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        createdAt: toDateTimeString(data.createdAt),
        updatedAt: toDateTimeString(data.updatedAt),
      };
    });
    return NextResponse.json({ ok: true, items, canReply: Boolean(perm.reply) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "replies GET failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const postId = normalize(body.postId);
    const content = normalize(body.content);
    if (!postId) return NextResponse.json({ ok: false, message: "postId is required" }, { status: 400 });
    if (!content) return NextResponse.json({ ok: false, message: "content is required" }, { status: 400 });

    const postSnap = await getDoc(doc(db, "board_posts", postId));
    if (!postSnap.exists()) return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });

    const post = postSnap.data() as any;
    const slug = normalize(post.slug);
    const perm = await getCategoryPerm(slug);
    const authorId = normalize(body.authorId) || null;
    const authorName = normalize(body.authorName) || "익명";
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });
    if (!perm.reply) return deny("no permission to reply");

    const ref = await addDoc(collection(db, "board_replies"), {
      postId,
      slug,
      content,
      authorId,
      authorName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "replies POST failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = normalize(url.searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

    const replyRef = doc(db, "board_replies", id);
    const replySnap = await getDoc(replyRef);
    if (!replySnap.exists()) return NextResponse.json({ ok: false, message: "reply not found" }, { status: 404 });

    const reply = replySnap.data() as any;
    const slug = normalize(reply.slug);
    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });

    // MVP: reply 권한 또는 edit 권한이 있으면 삭제 허용
    if (!perm.reply && !perm.edit) return deny("no permission to delete reply");

    await deleteDoc(replyRef);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "replies DELETE failed" }, { status: 500 });
  }
}
