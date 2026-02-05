// src/routes/api/youtube/picks/+server.ts
import { json } from "@sveltejs/kit";
import { YOUTUBE_API_KEY, OPENAI_API_KEY } from "$env/static/private";
import { resolveChannelId } from "$lib/server/youtube";
import { getTranscriptText, isTranscriptUnavailableError } from "$lib/server/transcript";
import { getVideoSnippet } from "$lib/server/youtube";
import { qstashPublishJSON } from "$lib/server/qstash";
import { PUBLIC_BASE_URL } from "$env/static/public";

type Pick = {
  market: "KOSPI" | "KOSDAQ";
  code: string;
  name: string;
  reason: string;
  confidence?: number;
};

async function getLatestVideo(channelId: string) {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY missing");

  const api =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}` +
    `&order=date&type=video&maxResults=1&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;

  const res = await fetch(api);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const item = data?.items?.[0];
  const videoId = item?.id?.videoId;
  const title = item?.snippet?.title;
  const publishedAt = item?.snippet?.publishedAt;

  if (!videoId) throw new Error("latest video not found");

  return {
    videoId: String(videoId),
    title: String(title ?? ""),
    publishedAt: String(publishedAt ?? ""),
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

async function aiPickStocks(input: { title?: string; transcript: string }): Promise<Pick[]> {
  if (!OPENAI_API_KEY) return [];

  const system = `
너는 한국 주식 종목 추천을 만드는 분석기다.
입력은 유튜브 영상의 제목과 자막이다.
자막 근거로 "코스피/코스닥" 종목 Top Pick 1~3개를 뽑아라.

출력은 JSON만:
{
  "picks": [
    { "market": "KOSPI"|"KOSDAQ", "code": "6자리", "name":"종목명", "reason":"근거", "confidence": 0~1 }
  ]
}

규칙:
- 자막에 근거가 없으면 picks는 빈 배열.
- code는 6자리 숫자.
- market은 KOSPI/KOSDAQ만.
`.trim();

  const body = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: `제목: ${input.title ?? ""}\n\n자막:\n${input.transcript.slice(0, 12000)}` },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`OpenAI failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";

  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }

  const picks = Array.isArray(parsed?.picks) ? parsed.picks : [];
  return picks
    .slice(0, 3)
    .map((p: any) => ({
      market: p.market,
      code: String(p.code ?? "").padStart(6, "0").slice(0, 6),
      name: String(p.name ?? ""),
      reason: String(p.reason ?? ""),
      confidence: typeof p.confidence === "number" ? p.confidence : undefined,
    }))
    .filter((p: Pick) => (p.market === "KOSPI" || p.market === "KOSDAQ") && /^\d{6}$/.test(p.code) && p.name && p.reason);
}

function normalizeOrigin(v: string) {
  const s = (v ?? "").trim().replace(/\/+$/, "");
  // http/https 아니면 무시
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

export async function GET({ url }: any) {
  const channelUrl = url.searchParams.get("channelUrl") ?? "";
  if (!channelUrl) {
    return json({ ok: false, checkedAt: new Date().toISOString(), channelUrl, error: "channelUrl is required" }, { status: 400 });
  }

  try {
    const channelId = await resolveChannelId(channelUrl);
    const latest = await getLatestVideo(channelId);

    let transcript = "";
    let warning: string | null = null;

    try {
      transcript = await getTranscriptText(latest.videoId);
    } catch (e) {
      if (isTranscriptUnavailableError(e)) {
        // ✅ 자막 없으면 설명 기반으로 대체
        const sn = await getVideoSnippet(latest.videoId);
        transcript = sn.description || "";
        warning = sn.description
          ? "자막이 없어 영상 설명(description) 기반으로 분석했어."
          : "자막과 영상 설명이 모두 부족해 TopPick 분석 정확도가 낮을 수 있어.";
      } else {
        throw e;
      }
    }
    const picks = await aiPickStocks({ title: latest.title, transcript });

    const notify = url.searchParams.get("notify") === "1";

    let queued = false;
    if (notify) {
      const envOrigin = normalizeOrigin(PUBLIC_BASE_URL);
      const origin = envOrigin || url.origin; // url.origin은 보통 https://hamsfam-stock.vercel.app
      const processUrl = new URL("/api/youtube/process", origin).href;
      console.log("[QSTASH dest]", processUrl);
      await qstashPublishJSON({
        url: processUrl,
        body: {
          videoId: latest.videoId,
          title: latest.title,
          publishedAt: latest.publishedAt,
          channelId,
        },
        deduplicationId: `yt:${latest.videoId}`,
        retries: 3,
        timeout: "30s",
      });

      queued = true;
    }

    return json({
      ok: true,
      checkedAt: new Date().toISOString(),
      channelUrl,
      channelId,
      latestVideo: {
        title: latest.title,
        url: latest.url,
        publishedAt: latest.publishedAt,
      },
      picks,
      warning,
      queued, 
    });
  } catch (e: any) {
    return json({ ok: false, checkedAt: new Date().toISOString(), channelUrl, error: e?.message ?? "picks failed" }, { status: 500 });
  }
}
