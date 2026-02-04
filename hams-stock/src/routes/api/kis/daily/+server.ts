// src/routes/api/kis/daily/+server.ts
import { json } from "@sveltejs/kit";
import { kisGet } from "$lib/server/kisClient";

type KisDailyItemChartResp = {
  output2?: Array<{
    stck_bsop_date?: string; // 영업일자 (YYYYMMDD 형태가 흔함)
    stck_clpr?: string;      // 종가
  }>;
  output1?: any;
  msg1?: string;
  rt_cd?: string;
};

function ymdToDashed(yyyymmdd: string) {
  const s = (yyyymmdd ?? "").trim();
  if (!/^\d{8}$/.test(s)) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export async function GET({ url, fetch }) {
  const code = url.searchParams.get("code") ?? "";
  const from = url.searchParams.get("from") ?? ""; // YYYY-MM-DD
  const to = url.searchParams.get("to") ?? "";     // YYYY-MM-DD
  if (!/^\d{6}$/.test(code)) return json({ error: "invalid code" }, { status: 400 });

  const period = (url.searchParams.get("period") ?? "D").toUpperCase();
  const periodDiv = period === "Y" ? "Y" : period === "M" ? "M" : "D";

  // KIS는 대개 YYYYMMDD를 기대
  const from8 = from.replaceAll("-", "");
  const to8 = to.replaceAll("-", "");

  // ✅ 문서: 국내주식기간별시세(일/주/월/년) :contentReference[oaicite:8]{index=8}
  // 실제 query 키는 KIS 문서 기준으로 사용 (대표적으로 아래 형태로 호출됨)
  const data = await kisGet<KisDailyItemChartResp>(
    fetch,
    "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
    {
      FID_COND_MRKT_DIV_CODE: "J",  // KRX
      FID_INPUT_ISCD: code,
      FID_INPUT_DATE_1: from8,
      FID_INPUT_DATE_2: to8,
      FID_PERIOD_DIV_CODE: periodDiv,
      FID_ORG_ADJ_PRC: "0",
    },
    "FHKST03010100" // (대표 TR ID 예시) 환경에 따라 변경될 수 있음
  );

  const rows = Array.isArray(data.output2) ? data.output2 : [];

  const series = rows
    .map((r) => ({
      date: ymdToDashed(r.stck_bsop_date ?? ""),
      close: Number(r.stck_clpr ?? 0),
    }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.close))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return json({ series });
}
