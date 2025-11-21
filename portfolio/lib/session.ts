import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload  } from "jose";
import { User } from "@/types/user";

// 백엔드와 같은 시크릿을 프론트(.env.local)에 넣되, NEXT_PUBLIC로 시작하지 마세요!
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
type JwtUserPayload = JWTPayload & User;

export async function getUserServer(): Promise<User | null> { 
  const store = await cookies();
  const token = store.get("access_token")?.value;
  // console.log("token 확인 : ", token);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: undefined, audience: undefined, // 필요시 설정
    });
    const p = payload as JwtUserPayload;
    if (!p.uid || !p.email) return null;

    const user: User = {
      uid: p.uid,
      email: p.email,
      username: p.username ?? '',
      roles: p.roles ?? [''],
      provider: p.provider,
      provider_id: p.provider_id,
    };
    return user;
  } catch {
    return null;
  }
}

