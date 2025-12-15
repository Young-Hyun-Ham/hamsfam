// app/api/admin/firebase/user-info/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const COLLECTION = "users";

type Params = {
  params: Promise<{ id: string }>;
};
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "id가 필요합니다." },
        { status: 400 }
      );
    }

    await adminDb.collection(COLLECTION).doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin firebase users delete error:", e);
    return NextResponse.json(
      { error: "사용자 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
