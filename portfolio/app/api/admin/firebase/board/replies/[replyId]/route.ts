import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const COL = "board_posts";
const SUB = "replies";

function parseRoles(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    // "admin,user" 혹은 '["admin"]' 둘 다 대비
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.map(String);
    } catch {}
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// ✅ 실제로는 인증 미들웨어/세션에서 userId/roles를 가져오는 게 정석이야.
// 현재 프로젝트 흐름을 깨지 않기 위해 "헤더 우선, 없으면 body"로 처리.
function getActor(req: Request, body: any) {
  const actorId = (req.headers.get("x-user-id") ?? body?.actorId ?? "").trim();
  const roles = parseRoles(req.headers.get("x-user-roles") ?? body?.actorRoles);
  return { actorId, roles };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ replyId: string }> }) {
  try {
    const { replyId } = await ctx.params;
    const body = await req.json();

    const postId = String(body?.postId ?? "").trim();
    const content = String(body?.content ?? "").trim();
    if (!postId) return NextResponse.json({ message: "postId is required" }, { status: 400 });
    if (!replyId) return NextResponse.json({ message: "replyId is required" }, { status: 400 });
    if (!content) return NextResponse.json({ message: "content is required" }, { status: 400 });

    const { actorId, roles } = getActor(req, body);
    // if (!actorId ) return NextResponse.json({ message: "actorId is required" }, { status: 401 });

    const replyRef = adminDb.collection(COL).doc(postId).collection(SUB).doc(replyId);

    const saved = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(replyRef);
      if (!snap.exists) throw new Error("REPLY_NOT_FOUND");

      const prev = snap.data() as any;
      if (prev.deleted) throw new Error("REPLY_DELETED");

      const isOwner = String(prev.authorId) === String(actorId);
      const isAdmin = roles.includes("admin");
      if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");

      const now = new Date().toISOString();
      const next = { ...prev, content, updatedAt: now };

      tx.set(replyRef, { content, updatedAt: now }, { merge: true });
      return next;
    });

    return NextResponse.json({ ok: true, item: saved });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg === "REPLY_NOT_FOUND") return NextResponse.json({ message: "not found" }, { status: 404 });
    if (msg === "REPLY_DELETED") return NextResponse.json({ message: "deleted reply" }, { status: 400 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "forbidden" }, { status: 403 });
    return NextResponse.json({ message: "failed", detail: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ replyId: string }> }) {
  try {
    const { replyId } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const postId = String(body?.postId ?? "").trim();
    if (!postId) return NextResponse.json({ message: "postId is required" }, { status: 400 });

    const { actorId, roles } = getActor(req, body);
    // if (!actorId) return NextResponse.json({ message: "actorId is required" }, { status: 401 });

    const replyRef = adminDb.collection(COL).doc(postId).collection(SUB).doc(replyId);

    const saved = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(replyRef);
      if (!snap.exists) throw new Error("REPLY_NOT_FOUND");

      const prev = snap.data() as any;

      const isOwner = String(prev.authorId) === String(actorId);
      const isAdmin = roles.includes("admin");
      if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");

      const now = new Date().toISOString();

      // ✅ soft delete (트리/정렬 유지)
      tx.set(
        replyRef,
        { deleted: true, content: "", updatedAt: now },
        { merge: true }
      );

      return { ...prev, deleted: true, content: "", updatedAt: now };
    });

    return NextResponse.json({ ok: true, item: saved });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg === "REPLY_NOT_FOUND") return NextResponse.json({ message: "not found" }, { status: 404 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "forbidden" }, { status: 403 });
    return NextResponse.json({ message: "failed", detail: msg }, { status: 500 });
  }
}
