// src/lib/server/sttClient.ts
const STT_BASE_URL = "http://localhost:8081";

export async function fetchSttTranscript(videoId: string): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = 10 * 60 * 1000; // ✅ 10분
  const t = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(`${STT_BASE_URL}/stt/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
      signal: controller.signal,
    });

    const txt = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`STT server failed: ${res.status} ${txt}`);

    const data = txt ? JSON.parse(txt) : {};
    const text = String(data?.transcript ?? "").trim();
    if (!text) throw new Error("Empty STT transcript");
    return text;
  } finally {
    clearTimeout(t);
  }
}
