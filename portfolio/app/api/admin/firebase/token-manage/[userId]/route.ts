// app/api/admin/firebase/token-manage/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { toDateTimeString } from "@/lib/utils/Utils";

const TOKEN_COLLECTION = "user_token";

type Params = {
  params: Promise<{ userId: string }>;
};
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 },
      );
    }

    const historyRef = adminDb
      .collection(TOKEN_COLLECTION)
      .doc(userId)
      .collection("history");

    const snap = await historyRef.orderBy("createdAt", "desc").get();

    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        amount: data.amount,
        memo: data.memo,
        createdAt: toDateTimeString(data.createdAt),
        beforeTotal: data.beforeTotal,
        afterTotal: data.afterTotal,
        beforeRemain: data.beforeRemain,
        afterRemain: data.afterRemain,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("admin firebase user-tokens history error:", e);
    return NextResponse.json(
      { error: "토큰 충전 이력 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
