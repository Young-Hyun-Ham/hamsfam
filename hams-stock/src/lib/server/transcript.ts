// src/lib/server/transcript.ts
import { YoutubeTranscript } from "youtube-transcript";

export class TranscriptUnavailableError extends Error {
  constructor(message = "Transcript not available (captions disabled or not provided)") {
    super(message);
    this.name = "TranscriptUnavailableError";
  }
}

export function isTranscriptUnavailableError(e: unknown) {
  return e instanceof TranscriptUnavailableError || (e instanceof Error && e.name === "TranscriptUnavailableError");
}

export async function getTranscriptText(videoId: string): Promise<string> {
  // 1) 한국어 우선
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ko" });
    const text = items.map((x) => x.text).join(" ");
    if (text.trim()) return text;
  } catch {
    // ignore
  }

  // 2) 영어 fallback
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
    const text = items.map((x) => x.text).join(" ");
    if (text.trim()) return text;
  } catch {
    // ignore
  }

  // ✅ “자막 없음”은 운영에서 흔하니 구분 가능한 에러로
  throw new TranscriptUnavailableError();
}
