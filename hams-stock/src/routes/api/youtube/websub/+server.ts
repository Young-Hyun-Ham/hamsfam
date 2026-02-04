// src/routes/api/youtube/websub/+server.ts
import { json } from "@sveltejs/kit";
import { qstashPublishJSON } from "$lib/server/qstash";

function extractFromAtom(xml: string) {
  const videoId = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim() ?? "";
  const title = xml.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() ?? "";
  const link = xml.match(/<link[^>]+href="([^"]+)"[^>]*\/>/)?.[1]?.trim() ?? "";
  const published = xml.match(/<published>([^<]+)<\/published>/)?.[1]?.trim() ?? "";
  return { videoId, title, link, published };
}

export async function GET({ url }: any) {
  const challenge = url.searchParams.get("hub.challenge");
  if (!challenge) return new Response("missing hub.challenge", { status: 400 });
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST({ request }: any) {
  try {
    const xml = await request.text();
    const info = extractFromAtom(xml);

    // 삭제/수정 이벤트 등 videoId가 없을 수 있음 → 그냥 OK
    if (!info.videoId) return new Response("ok", { status: 200 });

    const base = process.env.PUBLIC_APP_URL;
    if (!base) throw new Error("PUBLIC_APP_URL env missing");

    const jobUrl = `${base.replace(/\/$/, "")}/api/youtube/jobs/analyze`;

    // ✅ 무거운 작업은 큐로
    await qstashPublishJSON({
      url: jobUrl,
      body: {
        videoId: info.videoId,
        title: info.title,
        link: info.link,
        published: info.published,
        receivedAt: new Date().toISOString(),
      },
    });

    // ✅ 웹훅은 즉시 200 OK
    return new Response("ok", { status: 200 });
  } catch (e: any) {
    // 운영에서는 hub 재시도 방지 위해 200으로 삼키고 로그만 남기는 것도 고려
    return json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
