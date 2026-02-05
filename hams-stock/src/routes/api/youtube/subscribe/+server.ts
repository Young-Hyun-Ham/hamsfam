// src/routes/api/youtube/subscribe/+server.ts
import { json } from "@sveltejs/kit";
import { resolveChannelId, makeChannelFeedUrl } from "$lib/server/youtube";
import { PUBLIC_BASE_URL } from "$env/static/public";

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

export async function POST({ request, url }: any) {
  try {
    const { channelUrl } = await request.json();
    if (!channelUrl) {
      return json({ ok: false, error: "channelUrl is required" }, { status: 400 });
    }

    const channelId = await resolveChannelId(String(channelUrl));
    const topic = makeChannelFeedUrl(channelId);

    const origin = PUBLIC_BASE_URL || url.origin;
    const callback = `${origin}/api/youtube/websub`;

    const body = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.topic": topic,
      "hub.callback": callback,
      "hub.verify": "async",
    });

    const res = await fetch(HUB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    // Hub는 보통 202 Accepted로 응답함
    if (!res.ok && res.status !== 202) {
      throw new Error(`Hub subscribe failed: ${res.status} ${await res.text()}`);
    }

    return json({
      ok: true,
      channelUrl,
      channelId,
      topic,
      callback,
      hubStatus: res.status,
      note: "업로드 감지(WebSub) 파이프라인 ON. Hub가 callback 검증(GET hub.challenge)을 곧 시도합니다.",
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "subscribe failed" }, { status: 500 });
  }
}
