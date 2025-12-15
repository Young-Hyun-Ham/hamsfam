// app/api/admin/firebase/shortcut-menu/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const COLLECTION = "chatbot-shortcut-menus";

// 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group");
    const searchText = searchParams.get("searchText") ?? "";

    // STEP 1. Firestore 전체 조회
    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy("order", "asc")
      .get();

    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    // STEP 2. group 필터 (PROCESS_EXECUTION / SEARCH / EXECUTION)
    if (group) {
      list = list.filter((item) => {
        const g = (item.group ?? "").toUpperCase();
        return g === group;
      });
    }

    // STEP 3. searchText 필터 (label + description + scenarioKey)
    if (searchText) {
      list = list.filter((item) => {
        const combined = [
          item.label,
          item.description,
          item.scenarioKey,
          item.section,
        ]
          .join(" ")
          .toLowerCase();

        return combined.includes(searchText);
      });
    }

    return NextResponse.json({ items: list });
  } catch (error) {
    console.error("shortcut-menu list error:", error);
    return NextResponse.json(
      { error: "Failed to load shortcut menus" },
      { status: 500 },
    );
  }
}

// 등록
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const now = new Date().toISOString();

    const id = data.id ?? adminDb.collection(COLLECTION).doc().id;

    await adminDb.collection(COLLECTION).doc(id).set({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id });
  } catch (e) {
    console.error("shortcut-menu create error:", e);
    return NextResponse.json({ error: "Failed to create shortcut menu" }, { status: 500 });
  }
}
