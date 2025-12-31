// app/api/chatbot/firebase/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userKey = searchParams.get("userKey");

  if (!userKey) {
    return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
  }

  const snap = await adminDb.collection("chatbot").doc(userKey).get();

  if (!snap.exists) {
    return NextResponse.json({
      ok: true,
      data: {
        userKey,
        sessions: [],
        activeSessionId: null,
        systemPrompt: "",
      },
    });
  }

  return NextResponse.json({ ok: true, data: snap.data() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userKey, data } = body;
  if (!userKey || !data) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await adminDb.collection("chatbot").doc(userKey).set(data, { merge: true });

  return NextResponse.json({ ok: true });
}
