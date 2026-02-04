// src/routes/api/youtube/subscribe/+server.ts
import { json } from "@sveltejs/kit";
import { resolveChannelId, makeChannelFeedUrl } from "$lib/server/youtube";

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

export async function POST({ request }: any) {
  try {
    const body = await request.json();
    const channelUrl = String(body?.channelUrl ?? "").trim();
    if (!channelUrl) return json({ ok: false, error: "channelUrl required" }, { status: 400 });

    const channelId = await resolveChannelId(channelUrl);
    const topic = makeChannelFeedUrl(channelId);

    // callback은 반드시 외부에서 접근 가능한 공개 URL이어야 함
    const base = process.env.PUBLIC_APP_URL;
    if (!base) throw new Error("PUBLIC_APP_URL env missing");
    const callback = `${base.replace(/\/$/, "")}/api/youtube/websub`;

    // WebSub 구독 요청(폼)
    const form = new URLSearchParams();
    form.set("hub.mode", "subscribe");
    form.set("hub.topic", topic);
    form.set("hub.callback", callback);
    form.set("hub.verify", "async");

    const res = await fetch(HUB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    // 보통 202 Accepted가 옴(검증은 hub가 GET callback으로 challenge)
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
      note: "곧 Hub가 callback(GET)으로 challenge 검증을 시도할 거야.",
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
