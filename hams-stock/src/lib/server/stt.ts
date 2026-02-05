// src/lib/server/stt.ts
import { OPENAI_API_KEY } from "$env/static/private";

export class SttUnavailableError extends Error {
  constructor(message = "STT transcript not available") {
    super(message);
    this.name = "SttUnavailableError";
  }
}

/**
 * 운영 권장:
 * - 1) (워커) YouTube videoId -> audio file (mp3/wav) 생성 + 저장(S3/GCS)
 * - 2) 여기서는 그 audioUrl을 받아 STT만 수행
 */
export async function transcribeAudioUrl(audioUrl: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  if (!/^https?:\/\//i.test(audioUrl)) throw new Error("audioUrl must be http(s) URL");

  // audio 파일 다운로드
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`audio fetch failed: ${audioRes.status}`);

  const blob = await audioRes.blob();

  const form = new FormData();
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("file", blob, "audio.mp3");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) throw new Error(`OpenAI STT failed: ${res.status} ${await res.text()}`);

  const data: any = await res.json();
  const text = String(data?.text ?? "").trim();
  if (!text) throw new SttUnavailableError("Empty STT result");
  return text;
}
