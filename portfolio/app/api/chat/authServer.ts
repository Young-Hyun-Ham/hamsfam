/* eslint-disable @typescript-eslint/no-explicit-any */

import { cookies } from "next/headers";
import { verifyToken } from "./auth";

export async function requireUserId(req: Request): Promise<string> {
  // 1) Authorization: Bearer
  const auth = req.headers.get("authorization");
  let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;

  // 2) 없으면 쿠키 폴백
  if (!token) {
    const store = await cookies();
    token = store.get("access_token")?.value;
  }
  const payload: any = token ? verifyToken(token) : null;
  // payload 안의 식별자 키는 너희 구현에 맞춰 사용
  const userId = payload?.uid ?? payload?.id ?? payload?.userId;
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}
