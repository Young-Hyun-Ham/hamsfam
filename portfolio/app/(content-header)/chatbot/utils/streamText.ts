// app/(content-header)/chatbot/utils/streamText.ts
export type StreamDeltaHandler = (delta: string) => void;

function extractDelta(obj: any): string {
  return (
    obj?.delta ??
    obj?.text ??
    obj?.content ??
    obj?.message ??
    obj?.choices?.[0]?.delta?.content ??
    ""
  );
}

function tryParseJson(line: string): string | null {
  const s = line.trim();
  if (!s) return null;

  const looksJson =
    (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
  if (!looksJson) return null;

  try {
    const obj = JSON.parse(s);
    const delta = extractDelta(obj);
    return typeof delta === "string" ? delta : "";
  } catch {
    return null;
  }
}

// 스트리밍 파서
export async function readMixedTextStream(
  res: Response,
  onDelta: StreamDeltaHandler,
) {
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  const flush = (final: boolean) => {
    const lines = buffer.split(/\r?\n/);
    buffer = final ? "" : (lines.pop() ?? "");

    for (const raw of lines) {
      if (!raw) continue;
      const line = raw.trim();
      if (!line) continue;

      // SSE: data: ...
      if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") return "DONE";

        const parsed = tryParseJson(data);
        if (parsed != null) {
          if (parsed) onDelta(parsed);
          continue;
        }

        onDelta(data);
        continue;
      }

      // JSONL
      const parsed = tryParseJson(line);
      if (parsed != null) {
        if (parsed) onDelta(parsed);
        continue;
      }

      // plain
      onDelta(line);
    }

    return "CONTINUE";
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value || new Uint8Array(), { stream: true });
    if (!chunk) continue;

    buffer += chunk;
    const r = flush(false);
    if (r === "DONE") break;
  }

  flush(true);
}
