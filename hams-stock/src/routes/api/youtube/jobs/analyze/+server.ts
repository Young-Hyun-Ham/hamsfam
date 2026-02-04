// src/routes/api/youtube/jobs/analyze/+server.ts
import { json } from "@sveltejs/kit";
import { sendTelegram } from "$lib/server/telegram";
import { getTranscriptText } from "$lib/server/transcript";

// TODO: jose로 JWT verify 구현 권장.
// Upstash-Signature는 JWT이고, signing key로 검증 :contentReference[oaicite:5]{index=5}
async function verifyQstashSignature(request: Request, rawBody: string) {
  const sig = request.headers.get("Upstash-Signature");
  if (!sig) throw new Error("Missing Upstash-Signature");

  const key = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (!key) throw new Error("Missing QSTASH_CURRENT_SIGNING_KEY");

  // ✅ 여기서 JWT verify + body hash claim 검증
  // (간단히 시작하려면 우선 "개발 중"에는 생략 가능하지만, 운영은 꼭 검증해야 함)
  return true;
}

type Pick = {
  market: "KOSPI" | "KOSDAQ";
  code: string;
  name: string;
  reason: string;
  confidence?: number;
};

async function analyzeStocksFromTranscript(transcript: string): Promise<Pick[]> {
  // TODO: OpenAI 호출/내부 로직
  // 결과 1~3개만 리턴
  return [
    { market: "KOSPI", code: "005930", name: "삼성전자", reason: "샘플(LLM 연결 필요)", confidence: 0.72 },
  ];
}

export async function POST({ request }: any) {
  const raw = await request.text();

  try {
    await verifyQstashSignature(request, raw);

    const job = JSON.parse(raw) as {
      videoId: string;
      title?: string;
      link?: string;
      published?: string;
    };

    if (!job.videoId) return json({ ok: false, error: "videoId required" }, { status: 400 });

    // 1) 스크립트 추출
    const transcript = await getTranscriptText(job.videoId);

    // 2) AI 분석
    const picks = await analyzeStocksFromTranscript(transcript);

    // 3) 텔레그램 전송
    const msg = [
      `🔔 <b>유튜브 분석 알림</b>`,
      ``,
      `🎬 <b>${escapeHtml(job.title ?? "새 영상")}</b>`,
      job.link ? `링크: ${job.link}` : `videoId: ${job.videoId}`,
      job.published ? `업로드: ${new Date(job.published).toLocaleString("ko-KR")}` : "",
      ``,
      `📌 <b>Top Pick</b>`,
      ...picks.slice(0, 3).map((p, i) => {
        const conf = typeof p.confidence === "number" ? ` (신뢰도 ${(p.confidence * 100).toFixed(0)}%)` : "";
        return `${i + 1}. [${p.market}] ${p.name} (${p.code})${conf}\n- ${escapeHtml(p.reason)}`;
      }),
    ].filter(Boolean).join("\n");

    await sendTelegram(msg);

    return json({ ok: true });
  } catch (e: any) {
    // QStash는 실패 시 재시도함. 재시도 전략은 QStash 설정으로 제어 가능 :contentReference[oaicite:6]{index=6}
    return json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
