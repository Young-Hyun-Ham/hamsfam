import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const COLLECTION = "chatbot-shortcut-menus";

type Params = {
  params: Promise<{ id: string }>;
};

// 수정
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const data = await req.json();

    await adminDb.collection(COLLECTION).doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("shortcut-menu update error:", e);
    return NextResponse.json({ error: "Failed to update shortcut menu" }, { status: 500 });
  }
}

// 삭제
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    await adminDb.collection(COLLECTION).doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("shortcut-menu delete error:", e);
    return NextResponse.json({ error: "Failed to delete shortcut menu" }, { status: 500 });
  }
}