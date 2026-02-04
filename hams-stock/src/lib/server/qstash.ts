// src/lib/server/qstash.ts
export async function qstashPublishJSON(opts: {
  url: string;
  body: any;
  headers?: Record<string, string>;
}) {
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN missing");

  // QStash publish endpoint로 목적지 URL을 전달
  // (docs: /publish endpoint + Bearer auth) :contentReference[oaicite:3]{index=3}
  const publishUrl = `https://qstash.upstash.io/v2/publish/${encodeURIComponent(opts.url)}`;

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: JSON.stringify(opts.body),
  });

  if (!res.ok) {
    throw new Error(`QStash publish failed: ${res.status} ${await res.text()}`);
  }
}
