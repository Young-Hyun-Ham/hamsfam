// src/routes/api/youtube/websub/+server.ts
import { json, text } from "@sveltejs/kit";
import { qstashPublishJSON } from "$lib/server/qstash";
import { PUBLIC_BASE_URL } from "$env/static/public";

function extractFirst(xml: string, re: RegExp) {
  const m = xml.match(re);
  return m?.[1] ?? "";
}

export async function GET({ url }: any) {
  // Hub verification
  const challenge =
    url.searchParams.get("hub.challenge") ||
    url.searchParams.get("hub_challenge");

  if (!challenge) return text("missing challenge", { status: 400 });
  return text(challenge, { status: 200 });
}

export async function POST({ request, url }: any) {
  try {
    const xml = await request.text();

    // Atom XML 내에서 videoId 추출
    const videoId = extractFirst(xml, /<yt:videoId>([^<]+)<\/yt:videoId>/i);
    const channelId = extractFirst(xml, /<yt:channelId>([^<]+)<\/yt:channelId>/i);

    // title은 feed title일 수도 있어서 entry title을 우선 매칭 시도
    const entryTitle =
      extractFirst(xml, /<entry>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<\/entry>/i) ||
      extractFirst(xml, /<title>([^<]+)<\/title>/i);

    const publishedAt =
      extractFirst(xml, /<entry>[\s\S]*?<published>([^<]+)<\/published>[\s\S]*?<\/entry>/i) ||
      extractFirst(xml, /<published>([^<]+)<\/published>/i) ||
      extractFirst(xml, /<updated>([^<]+)<\/updated>/i);

    if (!videoId) {
      // 삭제/변경 이벤트 등 변형일 수 있어 200 처리
      return json({ ok: true, skipped: true, reason: "videoId not found" });
    }

    const origin = PUBLIC_BASE_URL || url.origin;
    const processUrl = `${origin}/api/youtube/process`;

    // ✅ QStash enqueue (videoId 단위 중복 방지)
    await qstashPublishJSON({
      url: processUrl,
      body: { videoId, channelId, title: entryTitle, publishedAt },
      deduplicationId: `yt:${videoId}`,
      retries: 3,
      timeout: "30s",
    });

    return json({ ok: true, queued: true, videoId });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "websub failed" }, { status: 500 });
  }
}
