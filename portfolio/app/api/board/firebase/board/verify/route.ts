// app/api/board/firebase/board/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { normalize } from "../_utils";
import { verifyPassword } from "@/lib/utils/password";

function getCurrentUserId(req: NextRequest) {
  // 프로젝트에서 쓰는 방식에 맞춰 우선순위로 받기
  // - 예: useStore에서 api 요청 시 헤더로 X-User-Id 또는 Authorization 등을 붙일 수 있음
  const xUserId = normalize(req.headers.get("x-user-id"));
  if (xUserId) return xUserId;

  // Authorization: Bearer <uid> 같은 단순 운영이면 여기서 파싱
  const auth = normalize(req.headers.get("authorization"));
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = normalize(auth.slice(7));
    if (token) return token;
  }

  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = normalize(body.id);
    const password = normalize(body.password);
    if (!id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });
    if (!password) return NextResponse.json({ ok: false, message: "password is required" }, { status: 400 });

    const ref = doc(db, "board_posts", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });

    const post = snap.data() as any;

    // 작성자 검증 (보호글인 경우에만 강제)
    if (post?.hasPassword) {
      const currentUserId = getCurrentUserId(req);
      const authorId = normalize(post?.authorId);

      // 로그인 정보가 없거나, 작성자와 다르면 차단
      if (!currentUserId || !authorId || currentUserId !== authorId) {
        return NextResponse.json(
          { ok: false, message: "사용자 정보가 일치 하지 않습니다." },
          { status: 403 }
        );
      }
    }

    // 비번 없는 글이면 그냥 통과
    if (!post?.hasPassword || !post?.passwordHash) {
      return NextResponse.json({ ok: true });
    }

    const ok = await verifyPassword(password, post.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "invalid password" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "verify failed" }, { status: 500 });
  }
}
