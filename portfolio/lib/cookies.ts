// lib/cookies.ts
import { NextResponse } from 'next/server';

export const COOKIE = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
} as const;

type SameSite = 'lax' | 'strict' | 'none';

type BaseCookieOpts = {
  domain?: string;
  path?: string;
  maxAgeSec?: number;      // 초 단위
  crossSite?: boolean;     // 다른 오리진과 통신이면 true => SameSite=None
  secure?: boolean;        // 강제 설정(없으면 NODE_ENV로 자동)
  sameSite?: SameSite;     // 강제 설정(없으면 crossSite에 따라 자동)
  httpOnly?: boolean;      // 기본 true
};

function resolveCookieAttrs(req: Request, opts?: BaseCookieOpts) {
  // const isProd = process.env.NODE_ENV === 'production';
  // const secure = opts?.secure ?? isProd;
  // const sameSite: SameSite = opts?.sameSite ?? (opts?.crossSite ? 'none' : 'lax');
  const httpOnly = opts?.httpOnly ?? true;
  if (req.url.startsWith('http:') || req.headers.get('x-forwarded-proto') === 'http') {
    // console.log("[COOKIE] HTTP 요청 감지 - secure=false, sameSite=lax 강제 설정");
    // HTTP
    return {
        httpOnly,
        secure: false,   // HTTP에서는 무조건 false
        sameSite: 'lax', // HTTP에서는 무조건 lax
        path: opts?.path ?? '/',
        ...(opts?.domain ? { domain: opts.domain } : {}),
        ...(opts?.maxAgeSec ? { maxAge: opts.maxAgeSec } : {}),
    } as const;
  } else {
    // console.log("[COOKIE] HTTPS 요청 감지 - secure=true, sameSite=none 강제 설정");
    // HTTPS
    return {
        httpOnly,
        secure: true, // HTTPS에서는 무조건 true
        sameSite: 'none', // HTTPS에서는 무조건 none
        path: opts?.path ?? '/',
        ...(opts?.domain ? { domain: opts.domain } : {}),
        ...(opts?.maxAgeSec ? { maxAge: opts.maxAgeSec } : {}),
    } as const;
  }
}

/** 요청이 크로스 오리진인지 간단히 판단 */
export function isCrossSite(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin !== new URL(req.url).origin;
  } catch {
    return false;
  }
}

/** 액세스 토큰 쿠키 세팅 */
export function setTokenCookie(
  req: Request,
  res: NextResponse,
  name: string,
  token: string,
  opts?: BaseCookieOpts,
) {
  res.cookies.set({
    name: name ?? 'http_token',
    value: token,
    ...resolveCookieAttrs(req, { maxAgeSec: opts?.maxAgeSec ?? 60 * Number(process.env.JWT_EXPIRES_IN ?? 10), ...opts }),
  });
}

/** 리프레시 토큰 쿠키 세팅 */
export function setRefreshTokenCookie(
  req: Request,
  res: NextResponse,
  token: string,
  opts?: BaseCookieOpts
) {
  res.cookies.set({
    name: COOKIE.REFRESH,
    value: token,
    ...resolveCookieAttrs(req, { maxAgeSec: opts?.maxAgeSec ?? 60 * 60 * 24 * 30, ...opts }), // 기본 30d
  });
}

/** 액세스 토큰 쿠키 세팅 */
export function setAccessTokenCookie(
  req: Request,
  res: NextResponse,
  token: string,
  opts?: BaseCookieOpts,
) {
  res.cookies.set({
    name: COOKIE.ACCESS,
    value: token,
    ...resolveCookieAttrs(req, opts),
  });
}

/** 액세스 토큰 쿠키 제거(만료) — 설정값(path/domain/sameSite/secure)을 반드시 동일하게 */
export function clearTokenCookie(
  req: Request,
  res: NextResponse,
  name: string,
  opts?: BaseCookieOpts,
) {
  const base = resolveCookieAttrs(req, opts);
  res.cookies.set({
    name: name ?? COOKIE.ACCESS,
    value: '',
    ...base,
    maxAge: 0, // 즉시 만료
  });
}
