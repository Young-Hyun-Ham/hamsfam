// src/lib/server/youtube.ts
const YT_API_KEY = process.env.YOUTUBE_API_KEY || "";

/**
 * 지원 형태
 * - https://www.youtube.com/channel/UCxxxx  -> channelId 추출
 * - https://www.youtube.com/@handle         -> Data API로 channelId 조회(권장)
 * - 이미 channelId(UC...) 입력해도 OK
 */
export async function resolveChannelId(input: string): Promise<string> {
  const s = (input || "").trim();

  // UC... 직접 들어온 경우
  if (/^UC[a-zA-Z0-9_-]{10,}$/.test(s)) return s;

  // /channel/UC... 형태
  const m1 = s.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{10,})/i);
  if (m1) return m1[1];

  // /@handle 형태
  const m2 = s.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/i);
  if (m2) {
    const handle = m2[1];
    if (!YT_API_KEY) throw new Error("YOUTUBE_API_KEY is required to resolve @handle URL");

    // handle로 채널 검색 (Data API)
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=` +
      encodeURIComponent(handle) +
      `&key=${encodeURIComponent(YT_API_KEY)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);
    const data = await res.json();

    const channelId = data?.items?.[0]?.snippet?.channelId;
    if (!channelId) throw new Error("channelId resolve failed");
    return channelId;
  }

  throw new Error("지원하지 않는 유튜브 주소 형식이야. channel/UC.. 또는 @handle 형태로 넣어줘.");
}

export function makeChannelFeedUrl(channelId: string) {
  // WebSub topic
  return `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}
