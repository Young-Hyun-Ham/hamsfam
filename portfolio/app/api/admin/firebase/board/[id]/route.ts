// app/api/admin/firebase/board/[id]/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { tokenizeForSearch } from "@/lib/utils/utils";

const COL = "board_posts";

type BoardPayload = {
    id: string;
    slug: "notice" | "faq" | "qna" | "general";
    title: string;
    content: string;
    tags: string[];
    authorName: string;
    tokens?: string[];
    password?: string;
    hasPassword?: boolean;
    updatedAt?: string; // ISO
}
type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as BoardPayload;

  const tokens = tokenizeForSearch(body.title, body.content, body.tags);
  const patch: any = {
    slug: body.slug,
    title: body.title,
    content: body.content,
    tokens,
    authorName: body.authorName,
    updatedAt: new Date().toISOString(),
  };
  if (body?.tags != null) patch.tag = body.tags;
  if (body?.password != null) patch.password = String(body.password).trim();
  if (body?.password != null) { patch.hasPassword = true } else { patch.hasPassword = false };
  
  const ref = adminDb.collection(COL).doc(id);
  await ref.set(patch, { merge: true });

  const after = await ref.get();
  return NextResponse.json(after.data());
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ message: "board id is required" }, { status: 400 });
  }

  // 게시판 삭제 - 하위 컬렉션 까지 전부 삭제
  await adminDb.recursiveDelete(
    adminDb.collection(COL).doc(id)
  );
  return NextResponse.json({ ok: true });
}