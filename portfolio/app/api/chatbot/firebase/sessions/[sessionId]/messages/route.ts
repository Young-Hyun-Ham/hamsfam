// app/api/chatbot/firebase/sessions/[sessionId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function preview(text: string) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > 120 ? t.slice(0, 120) + "…" : t;
}

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const { userKey, message } = await req.json();

    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }
    if (!message?.id) {
      return NextResponse.json({ ok: false, message: "message.id required" }, { status: 400 });
    }

    const createdAt = message?.createdAt ?? new Date().toISOString();

    const sessionRef = adminDb
      .collection("chatbot")
      .doc(userKey)
      .collection("sessions")
      .doc(sessionId);

    // message.id를 문서ID로 사용
    const msgRef = sessionRef.collection("messages").doc(String(message.id));

    await msgRef.set(
      {
        ...message,
        createdAt,
        _createdAtServer: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // ✅ 세션 메타 갱신
    await sessionRef.set(
      {
        updatedAt: new Date().toISOString(),
        lastMessageAt: createdAt,
        lastMessagePreview: preview(message?.content ?? ""),
        // messageCount는 "새 문서일 때만" 올리는게 정확하지만
        // 최소수정: 우선 항상 +1 (필요하면 트랜잭션으로 보정 가능)
        messageCount: FieldValue.increment(1),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, messageId: String(message.id) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}
