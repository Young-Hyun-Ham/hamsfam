// app/api/chatbot/firebase/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest) {
  try {
    const { userKey, patch } = await req.json();
    if (!userKey) {
      return NextResponse.json({ ok: false, message: "userKey required" }, { status: 400 });
    }

    const ref = adminDb.collection("chatbot").doc(userKey);

    await ref.set(
      {
        ...(patch ?? {}),
        updatedAt: new Date().toISOString(),
        _updatedAtServer: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}

