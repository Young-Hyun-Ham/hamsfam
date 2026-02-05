// src/lib/server/qstash.ts
import { QSTASH_TOKEN, QSTASH_URL } from "$env/static/private";

type PublishOpts = {
  url: string; // destination (https://...)
  body: any;
  deduplicationId?: string;
  contentBasedDeduplication?: boolean;
  retries?: number;
  timeout?: string;
};

function normalizeBaseUrl(u?: string) {
  const base = (u || "https://qstash.upstash.io").trim();
  return base.replace(/\/+$/, "");
}

function isLoopbackUrl(u: string) {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export async function qstashPublishJSON(opts: PublishOpts) {
  const dest = (opts.url ?? "").trim();
  console.log("[QSTASH dest raw]", opts.url);
  console.log("[QSTASH dest trim]", dest);

  if (!/^https?:\/\//i.test(dest)) {
    throw new Error(`Invalid destination url: "${dest}" (must start with http:// or https://)`);
  }

  // ✅ 1) 로컬(loopback)면 QStash 우회 → 직접 호출
  if (isLoopbackUrl(dest)) {
    console.log("[QSTASH bypass] loopback url → direct fetch", dest);

    const res = await fetch(dest, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts.body),
    });

    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[DIRECT publish failed]", {
        status: res.status,
        statusText: res.statusText,
        body: txt,
      });
      throw new Error(`Direct publish failed: ${res.status} ${txt}`);
    }

    console.log("[DIRECT publish ok]");
    return;
  }

  // ✅ 2) 여기부터는 기존 QStash 로직 (배포 환경)
  const token = QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN missing");

  const base = normalizeBaseUrl(QSTASH_URL);

  // QStash는 destination URL을 그대로 붙이는 방식
  const publishUrl = `${base}/v2/publish/${dest}`;

  console.log("[QSTASH base]", base);
  console.log("[QSTASH publishUrl]", publishUrl);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (opts.deduplicationId)
    headers["Upstash-Deduplication-Id"] = opts.deduplicationId;
  if (opts.contentBasedDeduplication)
    headers["Upstash-Content-Based-Deduplication"] = "true";
  if (typeof opts.retries === "number")
    headers["Upstash-Retries"] = String(opts.retries);
  if (opts.timeout)
    headers["Upstash-Timeout"] = opts.timeout;

  const res = await fetch(publishUrl, {
    method: "POST",
    headers,
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

  console.log("[QSTASH publish ok]");
}