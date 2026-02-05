// src/routes/api/youtube/process/+server.ts
import { json } from "@sveltejs/kit";
import { sendTelegram } from "$lib/server/telegram";
import { OPENAI_API_KEY } from "$env/static/private";
import { verifyQstashRequestOrThrow } from "$lib/server/qstashVerify";
import { adminDb, admin } from "$lib/server/fireAdmin";
import { getTranscriptText, isTranscriptUnavailableError } from "$lib/server/transcript";
import { getVideoSnippet } from "$lib/server/youtube";
import { transcribeAudioUrl } from "$lib/server/stt";

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
    args.analysisNote ? `🧾 <b>${escapeHtml(args.analysisNote)}</b>` : "",
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
  try { parsed = JSON.parse(content); } catch {}

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
    .filter((p: Pick) =>
      (p.market === "KOSPI" || p.market === "KOSDAQ") &&
      /^\d{6}$/.test(p.code) &&
      p.name &&
      p.reason
    );
}

// captions 기반 자막 추출 + description fallback
// export async function POST({ request, url }: any) {
//   try {
//     console.log("[PROCESS] hit", {
//       hasSignature: !!request.headers.get("Upstash-Signature"),
//       url: url.href,
//     });

//     // 1️⃣ QStash 서명 검증
//     const sig = request.headers.get("Upstash-Signature");
//     verifyQstashRequestOrThrow({ signature: sig, requestUrl: url.href });
//     console.log("[PROCESS] signature ok");

//     const { videoId, title, publishedAt, channelId } = await request.json();
//     console.log("[PROCESS] payload", { videoId, title, publishedAt, channelId });

//     if (!videoId) {
//       console.log("[PROCESS] missing videoId");
//       return json({ ok: false, error: "videoId is required" }, { status: 400 });
//     }

//     // 2️⃣ Firestore dedup
//     const ref = adminDb.collection("yt_processed").doc(String(videoId));
//     try {
//       await ref.create({
//         videoId: String(videoId),
//         channelId: channelId ?? null,
//         title: title ?? null,
//         publishedAt: publishedAt ?? null,
//         status: "processing",
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });
//       console.log("[PROCESS] firestore lock ok", videoId);
//     } catch (e: any) {
//       console.log("[PROCESS] firestore skip (already processed)", videoId);
//       return json({ ok: true, skipped: true, reason: "already-processed", videoId });
//     }

//     // 3️⃣ Transcript
//     let transcript = "";
//     let transcriptMode: "captions" | "description" | "none" = "captions";
//     try {
//       transcript = await getTranscriptText(String(videoId));
//     } catch (e) {
//       if (isTranscriptUnavailableError(e)) {
//         const sn = await getVideoSnippet(String(videoId));
//         transcript = sn.description || "";
//         transcriptMode = transcript ? "description" : "none";
//       } else {
//         throw e;
//       }
//     }
//     console.log("[PROCESS] transcriptMode", transcriptMode, "len", transcript.length);

//     // 4️⃣ AI 분석
//     const picks = await aiPickStocks({ title, transcript });
//     console.log("[PROCESS] picks.length", picks.length);

//     // 5️⃣ Telegram
//     const analysisNote =
//       transcriptMode === "captions"
//         ? "자막 기반 분석"
//         : transcriptMode === "description"
//           ? "자막 없음 → 설명(description) 기반 분석"
//           : "자막/설명 부족 → 분석 신뢰도 낮음";

//     if (picks.length > 0) {
//       console.log("[PROCESS] sending telegram...");
//       const msg = formatTelegramMessage({
//         videoId: String(videoId),
//         title,
//         publishedAt,
//         picks,
//         transcriptSample: transcript.slice(0, 220).trim(),
//         analysisNote,
//       });
//       await sendTelegram(msg);
//       console.log("[PROCESS] telegram sent");
//     } else {
//       console.log("[PROCESS] no picks → telegram skipped");
//     }

//     await ref.set(
//       {
//         transcriptMode,
//         picksCount: picks.length,
//         status: picks.length > 0 ? "sent" : "no-picks",
//       },
//       { merge: true }
//     );

//     return json({ ok: true, videoId, picksCount: picks.length });
//   } catch (e: any) {
//     console.error("[PROCESS] error", e);
//     return json({ ok: false, error: e?.message ?? "process failed" }, { status: 500 });
//   }
// }

export async function POST({ request, url }: any) {
  try {
    console.log("[PROCESS] hit", {
      hasSignature: !!request.headers.get("Upstash-Signature"),
      url: url.href,
    });

    // 1) QStash 서명 검증
    const sig = request.headers.get("Upstash-Signature");
    verifyQstashRequestOrThrow({ signature: sig, requestUrl: url.href });
    console.log("[PROCESS] signature ok");

    const { videoId, title, publishedAt, channelId, audioUrl } = await request.json();
    console.log("[PROCESS] payload", { videoId, channelId, hasAudioUrl: !!audioUrl });

    if (!videoId) return json({ ok: false, error: "videoId is required" }, { status: 400 });
    if (!audioUrl) return json({ ok: false, error: "audioUrl is required (for STT)" }, { status: 400 });

    // 2) Firestore dedup lock
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
      console.log("[PROCESS] firestore lock ok", videoId);
    } catch {
      console.log("[PROCESS] already processed -> skip", videoId);
      return json({ ok: true, skipped: true, reason: "already-processed", videoId });
    }

    // 3) STT transcript
    let transcript = "";
    let transcriptMode: "stt" | "description" | "none" = "none";

    if (audioUrl) {
      try {
        console.log("[PROCESS] stt start");
        transcript = await transcribeAudioUrl(String(audioUrl));
        transcriptMode = "stt";
        console.log("[PROCESS] stt ok", { len: transcript.length });
      } catch (e) {
        console.warn("[PROCESS] stt failed → fallback to description", e);
      }
    }

    if (!transcript) {
      const sn = await getVideoSnippet(String(videoId));
      transcript = sn.description || "";
      transcriptMode = transcript ? "description" : "none";
      console.log("[PROCESS] description fallback", { len: transcript.length });
    }
    console.log("[PROCESS] stt ok", { len: transcript.length });

    // 4) AI picks (기존 aiPickStocks 호출)
    const picks = await aiPickStocks({ title, transcript });
    console.log("[PROCESS] picks.length", picks.length);

    // 5) Telegram
    if (picks.length > 0) {
      console.log("[PROCESS] sending telegram...");
      const msg = formatTelegramMessage({
        videoId: String(videoId),
        title,
        publishedAt,
        picks,
        transcriptSample: transcript.slice(0, 220).trim(),
        analysisNote: "영상 음성(STT) 기반 분석",
      });
      await sendTelegram(msg);
      console.log("[PROCESS] telegram sent");
    } else {
      console.log("[PROCESS] sending telegram (no picks)");
      await sendTelegram(
        `🔔 업로드 감지\n\n🎬 ${title ?? "New Video"}\n🔗 https://www.youtube.com/watch?v=${videoId}\n\n⚠️ 분석 가능한 스크립트가 부족하여 종목 추천을 하지 못했습니다.`
      );
    }

    await ref.set(
      {
        status: picks.length > 0 ? "sent" : "no-picks",
        picksCount: picks.length,
        picks,
        transcriptSample: transcript.slice(0, 300).trim(),
        transcriptMode: "stt",
        sentAt: picks.length > 0 ? admin.firestore.FieldValue.serverTimestamp() : null,
      },
      { merge: true }
    );

    return json({ ok: true, videoId, picksCount: picks.length });
  } catch (e: any) {
    console.error("[PROCESS] error", e);
    return json({ ok: false, error: e?.message ?? "process failed" }, { status: 500 });
  }
}
