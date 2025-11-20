// app/api/oauth/google/route.ts

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { randomString } from "@/lib/oauth";
import { setTokenCookie } from "@/lib/cookies";

/**
 * @summary developer aouth connection
 * @description 구글 developer aouth 접속
 * @tag oauth
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectPath = url.searchParams.get("redirect") || "/";

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;
  const state = randomString(16);
  const nonce = randomString(16);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("prompt", "select_account"); // 필요 시 consent
  
  
  console.log("[OAUTH] redirectUri =", JSON.stringify(redirectUri));
  console.log("[OAUTH] authUrl =", authUrl.toString());

  const res = NextResponse.redirect(authUrl.toString());
  // CSRF/Replay 방지용 state/nonce를 쿠키에 잠깐 저장
  setTokenCookie(req, res, "g_state", state, {maxAgeSec: 60 * 5});
  setTokenCookie(req, res, "g_nonce", nonce, {maxAgeSec: 60 * 5});
  
  // 리다이렉트 목적지도 저장
  setTokenCookie(req, res, "post_login_redirect", redirectPath, {maxAgeSec: 60 * Number(process.env.JWT_EXPIRES_IN ?? 10)});
  return res;
}
