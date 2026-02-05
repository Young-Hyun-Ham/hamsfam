// src/lib/server/sttClient.ts
const STT_BASE_URL = "http://localhost:8081";

export async function fetchSttTranscript(videoId: string): Promise<string> {
  const res = await fetch(`${STT_BASE_URL}/stt/youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId }),
  });

  if (!res.ok) {
    throw new Error(`STT server failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text = String(data?.transcript ?? "").trim();
  if (!text) throw new Error("Empty STT transcript");

  return text;
}
