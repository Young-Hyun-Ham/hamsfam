// src/routes/api/youtube/jobs/analyze/+server.ts
import { json } from "@sveltejs/kit";
import { Receiver } from "@upstash/qstash"; // :contentReference[oaicite:6]{index=6}
import { sendTelegram } from "$lib/server/telegram";
import { getTranscriptText } from "$lib/server/transcript";
import { QSTASH_CURRENT_SIGNING_KEY } from "$env/static/private";
import { QSTASH_NEXT_SIGNING_KEY } from "$env/static/private";

type JobBody = {
  videoId: string;
  title?: string;
  link?: string;
  published?: string;
  receivedAt?: string;
};

// ✅ “강한” 중복 방지는 DB가 필요.
// 일단은 QStash dedup + 워커 내 best-effort(메모리)로 2중 방어.
const seen = new Map<string, number>();
const SEEN_TTL_MS = 6 * 60 * 60 * 1000; // 6시간

function markSeen(key: string) {
  const now = Date.now();
  seen.set(key, now);
  // 간단 청소
  for (const [k, t] of seen.entries()) {
    if (now - t > SEEN_TTL_MS) seen.delete(k);
  }
}

function isSeen(key: string) {
  const t = seen.get(key);
  return t != null && Date.now() - t <= SEEN_TTL_MS;
}

export async function POST({ request, url }) {
  const raw = await request.text();

  try {
    // 1) ✅ QStash 서명 검증 (운영 필수)
    const current = QSTASH_CURRENT_SIGNING_KEY;
    const next = QSTASH_NEXT_SIGNING_KEY || "";
    if (!current) throw new Error("QSTASH_CURRENT_SIGNING_KEY missing");

    const receiver = new Receiver({
      currentSigningKey: current,
      nextSigningKey: next || current, // next 없으면 current로 대체
    });

    const signature = request.headers.get("Upstash-Signature") || "";
    const isValid = await receiver.verify({
      signature,
      body: raw,
      // URL은 “이 엔드포인트의 공개 URL”
      // SvelteKit의 url.origin이 맞고, path를 붙여 정확히 만들어줌
      url: `${url.origin}/api/youtube/jobs/analyze`,
    });

    if (!isValid) return json({ ok: false, error: "Invalid signature" }, { status: 401 });

    // 2) job 파싱
    const job = JSON.parse(raw) as JobBody;
    if (!job.videoId) return json({ ok: false, error: "videoId required" }, { status: 400 });

    // 3) (best-effort) 중복 처리 방지
    const msgId = request.headers.get("Upstash-Message-Id"); // 있을 수 있음
    const dedupKey = msgId ? `msg:${msgId}` : `vid:${job.videoId}`;
    if (isSeen(dedupKey)) return json({ ok: true, skipped: true });
    markSeen(dedupKey);

    // 4) ✅ 스크립트 추출 (가능한 영상만)
    const transcript = await getTranscriptText(job.videoId);

    // 5) ✅ AI 분석(여기에 너의 LLM 로직 붙이면 됨)
    // 지금은 샘플. 다음 단계에서 "코스피/코스닥 종목 추출 + top 1~3"로 구현.
    const picks = [
      {
        market: "KOSPI" as const,
        code: "005930",
        name: "삼성전자",
        reason: "샘플(LLM 분석 로직 연결 필요)",
        confidence: 0.72,
      },
    ];

    // 6) 텔레그램 전송
    const msg = [
      `🔔 <b>유튜브 분석 알림</b>`,
      ``,
      `🎬 <b>${escapeHtml(job.title ?? "새 영상")}</b>`,
      job.link ? `링크: ${job.link}` : `videoId: ${job.videoId}`,
      job.published ? `업로드: ${new Date(job.published).toLocaleString("ko-KR")}` : "",
      ``,
      `🧾 <b>스크립트 길이</b>: ${transcript.length.toLocaleString()} chars`,
      ``,
      `📌 <b>Top Pick</b>`,
      ...picks.slice(0, 3).map((p, i) => {
        const conf = typeof p.confidence === "number" ? ` (신뢰도 ${(p.confidence * 100).toFixed(0)}%)` : "";
        return `${i + 1}. [${p.market}] ${p.name} (${p.code})${conf}\n- ${escapeHtml(p.reason)}`;
      }),
    ]
      .filter(Boolean)
      .join("\n");

    await sendTelegram(msg);

    return json({ ok: true });
  } catch (e: any) {
    // QStash는 실패(>=400/500)면 재시도할 수 있어. (retries 설정에 따라) :contentReference[oaicite:7]{index=7}
    return json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
