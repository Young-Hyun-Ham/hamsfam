// app/api/chatbot/firebase/sessions/[sessionId]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type Ctx = { params: Promise<{ sessionId: string; messageId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId, messageId } = await ctx.params;
    const { userKey, patch } = await req.json();
    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }

    const ref = adminDb
      .collection("chatbot")
      .doc(userKey)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .doc(messageId);

    await ref.set({ ...(patch ?? {}) }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId, messageId } = await ctx.params;
    const { userKey } = await req.json();
    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }

    await adminDb
      .collection("chatbot")
      .doc(userKey)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .doc(messageId)
      .delete();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}
