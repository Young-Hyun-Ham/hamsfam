// src/routes/api/kis/quote/+server.ts
import { json } from "@sveltejs/kit";
import { kisGet } from "$lib/server/kisClient";

type KisQuoteResp = {
  output?: {
    stck_prpr?: string; // 현재가
  };
};

export async function GET({ url, fetch }) {
  const code = url.searchParams.get("code") ?? "";
  if (!/^\d{6}$/.test(code)) return json({ error: "invalid code" }, { status: 400 });

  // ✅ 주식현재가 시세 endpoint 호출 예시는 문서/사례로 널리 공개됨 :contentReference[oaicite:10]{index=10}
  const data = await kisGet<KisQuoteResp>(
    fetch,
    "/uapi/domestic-stock/v1/quotations/inquire-price",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code,
    },
    "FHKST01010100" // (대표 TR ID 예시) 환경에 따라 변경될 수 있음
  );

  const currentPrice = Number(data?.output?.stck_prpr ?? 0);
  return json({ currentPrice: Number.isFinite(currentPrice) ? currentPrice : null });
}
