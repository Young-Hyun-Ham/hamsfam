// src/routes/api/youtube/process/+server.ts
import { json } from "@sveltejs/kit";
import { sendTelegram } from "$lib/server/telegram";
import { OPENAI_API_KEY } from "$env/static/private";
import { verifyQstashRequestOrThrow } from "$lib/server/qstashVerify";
import { adminDb, admin } from "$lib/server/fireAdmin";
import { getTranscriptText, isTranscriptUnavailableError } from "$lib/server/transcript";
import { getVideoSnippet } from "$lib/server/youtube";

type Pick = {
  market: "KOSPI" | "KOSDAQ";
  code: string;
  name: string;
  reason: string;
  confidence?: number;
};

function escapeHtml(s: string) {
  return (s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formatTelegramMessage(args: {
  videoId: string;
  title?: string;
  publishedAt?: string;
  picks: Pick[];
  transcriptSample?: string;
  analysisNote?: string;
}) {
  const videoUrl = `https://www.youtube.com/watch?v=${args.videoId}`;
  const head = [
    `🔔 <b>업로드 감지</b>`,
    args.analysisNote ? `🧾 <b>${escapeHtml(args.analysisNote)}</b>` : "", // ✅ 추가
    args.title ? `🎬 <b>${escapeHtml(args.title)}</b>` : `🎬 <b>New Video</b>`,
    args.publishedAt ? `🕒 ${escapeHtml(args.publishedAt)}` : "",
    `🔗 ${escapeHtml(videoUrl)}`,
    "",
    `✅ <b>Top Pick (1~3)</b>`,
  ].filter(Boolean);

  const lines = args.picks.map((p, i) => {
    const conf = typeof p.confidence === "number" ? ` (conf ${Math.round(p.confidence * 100)}%)` : "";
    return [
      `${i + 1}. <b>${escapeHtml(p.name)}</b> [${escapeHtml(p.code)} / ${escapeHtml(p.market)}]${conf}`,
      `- ${escapeHtml(p.reason)}`,
    ].join("\n");
  });

  const sample = args.transcriptSample
    ? `\n\n📝 <b>자막 샘플</b>\n${escapeHtml(args.transcriptSample)}`
    : "";

  return `${head.join("\n")}\n${lines.join("\n\n")}${sample}`;
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
- reason은 2~3문장으로 구체적으로.
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
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
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

export async function POST({ request, url }: any) {
  try {
    // ✅ 1) QStash 서명 검증 (외부 임의 호출 차단)
    const sig = request.headers.get("Upstash-Signature");
    verifyQstashRequestOrThrow({ signature: sig, requestUrl: url.href });

    const { videoId, title, publishedAt, channelId } = await request.json();
    if (!videoId) return json({ ok: false, error: "videoId is required" }, { status: 400 });

    // ✅ 2) Firestore dedup (원자적으로 create)
    const ref = adminDb.collection("yt_processed").doc(String(videoId));

    try {
      await ref.create({
        videoId: String(videoId),
        channelId: channelId ?? null,
        title: title ?? null,
        publishedAt: publishedAt ?? null,
        status: "processing",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e: any) {
      // 이미 존재하면 “이미 처리됨/처리중”으로 보고 스킵 → 중복 전송 방지
      const code = e?.code || e?.details || "";
      return json({ ok: true, skipped: true, reason: "already-processed", videoId, firestore: String(code) });
    }

    // 1) 자막 추출
    let transcript = "";
    let transcriptMode: "captions" | "description" | "none" = "captions";
    try {
      transcript = await getTranscriptText(String(videoId));
    } catch (e) {
      if (isTranscriptUnavailableError(e)) {
        const sn = await getVideoSnippet(String(videoId));
        transcript = sn.description || "";
        transcriptMode = transcript ? "description" : "none";
      } else {
        throw e;
      }
    }

    // 2) AI 검증 → TopPick
    const picks = await aiPickStocks({ title, transcript });

    // 3) 텔레그램 전송(없으면 생략 정책)
    const analysisNote =
      transcriptMode === "captions"
        ? "자막 기반 분석"
        : transcriptMode === "description"
          ? "자막 없음 → 설명(description) 기반 분석"
          : "자막/설명 부족 → 분석 신뢰도 낮음";
    if (picks.length > 0) {
      const msg = formatTelegramMessage({
        videoId: String(videoId),
        title,
        publishedAt,
        picks,
        transcriptSample: transcript.slice(0, 220).trim(),
        analysisNote,
      });
      await sendTelegram(msg);
    }

    // 처리 결과 저장
    // await ref.set(
    //   {
    //     status: "sent",
    //     sentAt: admin.firestore.FieldValue.serverTimestamp(),
    //     picksCount: picks.length,
    //     picks,
    //     transcriptSample: transcript.slice(0, 300).trim(),
    //   },
    //   { merge: true }
    // );
    // Firestore 기록에 transcriptMode도 저장(추천)
    await ref.set(
      {
        transcriptMode,
        warning:
          transcriptMode === "description"
            ? "captions_unavailable_used_description"
            : transcriptMode === "none"
              ? "captions_and_description_missing"
              : null,
      },
      { merge: true }
    );

    return json({ ok: true, videoId, picksCount: picks.length });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "process failed" }, { status: 500 });
  }
}
