// app/api/chatbot/firebase/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userKey = url.searchParams.get("userKey");
    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("chatbot")
      .doc(userKey)
      .collection("sessions")
      .orderBy("updatedAt", "desc")
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userKey, title, createdAt } = await req.json();
    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }

    const sessionId = `session-${Date.now()}`;
    const now = createdAt ?? new Date().toISOString();

    const ref = adminDb
      .collection("chatbot")
      .doc(userKey)
      .collection("sessions")
      .doc(sessionId);

    await ref.set({
      title: title ?? "새 채팅",
      createdAt: now,
      updatedAt: now,
      lastMessagePreview: "",
      lastMessageAt: "",
      messageCount: 0,
      _updatedAtServer: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, sessionId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}
