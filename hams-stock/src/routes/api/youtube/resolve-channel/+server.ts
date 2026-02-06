// src/routes/api/youtube/resolve-channel/+server.ts
import { json, error } from "@sveltejs/kit";

function normalizeUrl(input: string) {
  let v = (input ?? "").trim();
  if (!v) return "";
  // 스킴 없으면 붙여줌
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  return v;
}

function extractChannelIdFast(url: string): string | null {
  // 1) /channel/UCxxxx 형태
  const m1 = url.match(/\/channel\/(UC[a-zA-Z0-9_-]{10,})/);
  if (m1?.[1]) return m1[1];

  // 2) feeds URL에 channel_id 있는 경우
  const m2 = url.match(/[?&]channel_id=(UC[a-zA-Z0-9_-]{10,})/);
  if (m2?.[1]) return m2[1];

  return null;
}

function extractChannelIdFromHtml(html: string): string | null {
  // YouTube 페이지에는 보통 "channelId":"UCxxxx" 또는 externalId:"UCxxxx" 형태가 들어있음
  const patterns = [
    /"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{10,})"/,
    /"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]{10,})"/,
    /externalId"\s*:\s*"(UC[a-zA-Z0-9_-]{10,})"/,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function resolveChannelId(channelUrl: string): Promise<string | null> {
  const url = normalizeUrl(channelUrl);
  if (!url) return null;

  // 빠른 케이스 먼저
  const fast = extractChannelIdFast(url);
  if (fast) return fast;

  // @handle, /c/, /user/ 등은 HTML 파싱
  const res = await fetch(url, {
    headers: {
      // 봇 차단 완화용 UA
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) return null;

  const html = await res.text();
  return extractChannelIdFromHtml(html);
}

export async function GET({ url }) {
  const channelUrl = url.searchParams.get("url") ?? "";
  if (!channelUrl.trim()) throw error(400, "url is required");

  const channelId = await resolveChannelId(channelUrl);
  return json({ channelId: channelId ?? null });
}
