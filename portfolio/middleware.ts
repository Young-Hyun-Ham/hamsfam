// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? 'firebase';

export function middleware(req: NextRequest) {
  // Firebase 모드면 서버에서 인증 체크하지 않고 그냥 통과
  if (BACKEND === 'firebase') {
    return NextResponse.next();
  }

  // Postgres + JWT 모드일 때만 쿠키로 체크
  const token = req.cookies.get('access_token')?.value;

  if (
    !token &&
    (req.nextUrl.pathname.startsWith('/admin') ||
      req.nextUrl.pathname.startsWith('/main'))
  ) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}
