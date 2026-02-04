// src/lib/server/kisClient.ts
import { KIS_APP_KEY, KIS_APP_SECRET, KIS_BASE_URL } from "$env/static/private";

type TokenResp = {
  access_token: string;
  token_type?: string;
  expires_in?: number; // seconds
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function nowMs() {
  return Date.now();
}

async function getAccessToken(fetchFn: typeof fetch) {
  // 30초 여유를 두고 만료 처리
  if (cachedToken && cachedToken.expiresAt - 30_000 > nowMs()) return cachedToken.value;

  const url = `${KIS_BASE_URL}/oauth2/tokenP`;
  const res = await fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`KIS tokenP failed: ${res.status} ${t}`);
  }

  const data = (await res.json()) as TokenResp;
  if (!data?.access_token) throw new Error("KIS tokenP: access_token missing");

  // 문서상 24시간(1일 1회 발급)로 안내됨 :contentReference[oaicite:4]{index=4}
  const ttlSec = Number.isFinite(data.expires_in) ? (data.expires_in as number) : 86400;
  cachedToken = { value: data.access_token, expiresAt: nowMs() + ttlSec * 1000 };
  return cachedToken.value;
}

export async function kisGet<T>(
  fetchFn: typeof fetch,
  path: string,
  query: Record<string, string>,
  trId: string
): Promise<T> {
  const token = await getAccessToken(fetchFn);
  const qs = new URLSearchParams(query).toString();
  const url = `${KIS_BASE_URL}${path}?${qs}`;

  const res = await fetchFn(url, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
      tr_id: trId,
    },
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`KIS GET failed: ${res.status} ${t}`);
  }

  return (await res.json()) as T;
}
