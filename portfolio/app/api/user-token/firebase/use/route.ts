// app/api/user-token/firebase/use/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // 이미 쓰고 있는 Firestore 인스턴스 사용
import { useUserTokenFirebase } from "@/lib/utils/userToken";

/**
 * POST /api/user-token/firebase/use
 * body: { userId, amount, usageType, source?, sessionId?, messageId?, memo? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      userId,
      amount,
      usageType,
      source,
      sessionId,
      messageId,
      memo,
    } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId 가 없습니다." },
        { status: 400 },
      );
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "amount 는 0보다 큰 숫자여야 합니다." },
        { status: 400 },
      );
    }

    if (!usageType || typeof usageType !== "string") {
      return NextResponse.json(
        { error: "usageType 이 없습니다." },
        { status: 400 },
      );
    }

    await useUserTokenFirebase(db, {
      userId,
      amount: parsedAmount,
      usageType,
      source,
      sessionId,
      messageId,
      memo,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[user-token/firebase/use] error:", e);
    const message =
      typeof e?.message === "string"
        ? e.message
        : "토큰 사용 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
