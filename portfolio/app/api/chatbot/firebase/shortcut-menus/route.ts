// app/api/chatbot/firebase/shortcut-menus/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const searchText = (searchParams.get("searchText") ?? "").toLowerCase();

  const snap = await adminDb
    .collection("chatbot-shortcut-menus")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const items = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((item: any) =>
      [item.section, item.label, item.scenarioKey ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(searchText),
    );

  return NextResponse.json({ ok: true, items });
}
