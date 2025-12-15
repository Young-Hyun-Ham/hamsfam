// app/api/user-token/postgres/use/route.ts
import { NextRequest, NextResponse } from "next/server";
import { useUserTokenPostgres } from "@/lib/utils/userToken";

/**
 * POST /api/user-token/postgres/use
 * body: { userId, amount, usageType, source?, sessionId?, messageId?, memo? }
 *
 * 전제 테이블 (예시 DDL)
 *
 *  user_tokens (
 *    id uuid primary key default gen_random_uuid(),
 *    user_id text not null unique,
 *    total_token integer not null default 0,
 *    used_token integer not null default 0,
 *    remain_token integer not null default 0,
 *    created_at timestamptz not null default now(),
 *    updated_at timestamptz not null default now()
 *  )
 *
 *  user_token_history (
 *    id uuid primary key default gen_random_uuid(),
 *    user_id text not null,
 *    type text not null,          -- 'charge' | 'use'
 *    amount integer not null,
 *    before_total integer not null,
 *    after_total integer not null,
 *    before_remain integer not null,
 *    after_remain integer not null,
 *    memo text,
 *    created_at timestamptz not null default now()
 *  )
 *
 *  user_token_used (
 *    id uuid primary key default gen_random_uuid(),
 *    user_id text not null,
 *    amount integer not null,
 *    usage_type text not null,
 *    source text,
 *    session_id text,
 *    message_id text,
 *    description text,
 *    remain_token_after integer not null,
 *    created_at timestamptz not null default now()
 *  )
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

    await useUserTokenPostgres({
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
    console.error("[user-token/postgres/use] error:", e);
    const message =
      typeof e?.message === "string"
        ? e.message
        : "토큰 사용(PostgreSQL) 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
