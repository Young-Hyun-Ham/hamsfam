// app/api/auth/logout/route.ts
import { clearTokenCookie } from "@/lib/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 1) 우선 응답 객체 하나 만든다
  const res = NextResponse.json({ ok: true });

  // 2) 이 응답 객체에 쿠키 삭제 적용
  clearTokenCookie(req, res, "access_token");
  clearTokenCookie(req, res, "refresh_token");
  // 3) 쿠키가 세팅(삭제)된 이 응답을 리턴
  return res;
}
