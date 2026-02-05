// src/lib/server/qstash.ts
import { QSTASH_TOKEN, QSTASH_URL } from "$env/static/private";

type PublishOpts = {
  url: string;
  body: any;
  deduplicationId?: string;
  contentBasedDeduplication?: boolean;
  retries?: number;
  timeout?: string;
  headers?: Record<string, string>;
};

function normalizeBaseUrl(u?: string) {
  const base = (u || "https://qstash.upstash.io").trim();
  return base.replace(/\/+$/, ""); // trailing slash 제거
}

export async function qstashPublishJSON(opts: PublishOpts) {
  const token = QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN missing");

  const base = normalizeBaseUrl(QSTASH_URL);
  const publishUrl = `${base}/${encodeURIComponent(opts.url)}`;
  console.log("[QSTASH base]", base);
  console.log("[QSTASH publishUrl]", publishUrl);
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (opts.deduplicationId) h["Upstash-Deduplication-Id"] = opts.deduplicationId;
  if (opts.contentBasedDeduplication) h["Upstash-Content-Based-Deduplication"] = "true";
  if (typeof opts.retries === "number") h["Upstash-Retries"] = String(opts.retries);
  if (opts.timeout) h["Upstash-Timeout"] = opts.timeout;

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: h,
    body: JSON.stringify(opts.body),
  });

  if (!res.ok) {
    throw new Error(`QStash publish failed: ${res.status} ${await res.text()}`);
  }
}
