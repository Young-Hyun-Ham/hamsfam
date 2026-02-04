// src/lib/server/transcript.ts
import { YoutubeTranscript } from "youtube-transcript";

// youtube-transcript 사용 (unofficial) :contentReference[oaicite:8]{index=8}
export async function getTranscriptText(videoId: string): Promise<string> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ko" });
    const text = items.map((x) => x.text).join(" ");
    if (text.trim()) return text;
  } catch {
    // ko 실패 시 fallback
  }

  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
    const text = items.map((x: any) => x.text).join(" ");
    if (text.trim()) return text;
  } catch {
    // ignore
  }

  throw new Error("Transcript not available");
}
