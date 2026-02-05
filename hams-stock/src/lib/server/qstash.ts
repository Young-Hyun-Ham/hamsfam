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
  if (!opts.url || !/^https?:\/\//i.test(opts.url)) {
    throw new Error(`Invalid destination url: ${opts.url} (must start with http:// or https://)`);
  }

  const base = normalizeBaseUrl(QSTASH_URL);

  const dest = (opts.url ?? "").trim();
  console.log("[QSTASH dest raw]", opts.url);
  console.log("[QSTASH dest trim]", dest);

  if (!/^https?:\/\//i.test(dest)) {
    throw new Error(`Invalid destination url: "${dest}" (must start with http:// or https://)`);
  }

  const publishUrl = new URL(`/v2/publish/${encodeURIComponent(dest)}`, base).toString();

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

  const txt = await res.text();

  if (!res.ok) {
    console.error("[QSTASH publish failed]", {
      status: res.status,
      statusText: res.statusText,
      body: txt,
    });
    throw new Error(`QStash publish failed: ${res.status} ${txt}`);
  }

  // 성공이어도 body 로그(원하면 주석)
  console.log("[QSTASH publish ok]", txt);
}
