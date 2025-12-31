// app/api/chatbot/firebase/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

async function deleteCollectionInBatches(colRef: FirebaseFirestore.CollectionReference, batchSize = 400) {
  while (true) {
    const snap = await colRef.limit(batchSize).get();
    if (snap.empty) break;

    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

type Ctx = { params: Promise<{ sessionId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const { userKey, patch } = await req.json();
    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }

    const ref = adminDb
      .collection("chatbot")
      .doc(userKey)
      .collection("sessions")
      .doc(sessionId);

    await ref.set(
      {
        ...(patch ?? {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const { userKey } = await req.json();
    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }

    const sessionRef = adminDb
      .collection("chatbot")
      .doc(userKey)
      .collection("sessions")
      .doc(sessionId);

    const messagesCol = sessionRef.collection("messages");
    await deleteCollectionInBatches(messagesCol);

    await sessionRef.delete();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}
