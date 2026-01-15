// app/api/admin/firebase/board/verify/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { normalize } from "@/lib/utils/utils";
import { verifyPassword } from "@/lib/utils/password";

const COL = "board_posts";

export async function POST(req: Request) {
  const body = await req.json();

  const password = normalize(body.password);
  const resData = await adminDb.collection(COL).doc(body.id).get();
  const post = resData.data();
  
  if (!post?.hasPassword || !post?.passwordHash) {
    return NextResponse.json({ ok: true });
  }
  
  const ok = await verifyPassword(password, post.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "invalid password" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}