// app/api/admin/firebase/user-stats/[uid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type Params = { params: Promise<{ uid: string }> };
type RangeUnit = "day" | "week" | "month" | "year";

function formatLabel(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { uid } = await params;

  const { searchParams } = new URL(req.url);
  const rangeParam = (searchParams.get("range") || "day") as RangeUnit;
  const range: RangeUnit = ["day", "week", "month", "year"].includes(rangeParam)
    ? rangeParam
    : "day";

  // 1) 사용자 정보
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const u = userDoc.data() as any;
  const user = {
    id: userDoc.id,
    email: u.email ?? "",
    name: u.name ?? "",
    avatar_url: u.avatar_url ?? null,
  };

  // 2) 토큰 사용 로그 (user_token/{uid}/used 전체 조회)
  const usedSnap = await adminDb
    .collection("user_token")
    .doc(uid)
    .collection("used")
    .get();

  const now = new Date();

  // ---------- Line 차트용 범위/라벨 준비 ----------
  let chartLabels: string[] = [];
  let chartBuckets: number[] = [];
  let rangeStart: Date;
  let rangeEnd: Date;

  if (range === "day") {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    chartLabels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
  } else if (range === "week") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const day = startOfToday.getDay(); // 0:일 ~ 6:토
    const diffToMonday = (day + 6) % 7;
    rangeStart = new Date(startOfToday);
    rangeStart.setDate(startOfToday.getDate() - diffToMonday);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeStart.getDate() + 7);
    chartLabels = ["월", "화", "수", "목", "금", "토", "일"];
  } else if (range === "month") {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    chartLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0"));
  } else {
    rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
    chartLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
  }

  chartBuckets = new Array(chartLabels.length).fill(0);

  // ---------- KPI(전체)/기타 집계 ----------
  let todayTokens = 0;
  let monthTokens = 0;
  let totalTokens = 0;

  const dailyMap = new Map<string, number>();
  const scenarioMapAll = new Map<string, { runs: number; tokens: number }>(); // 전체 기준 (필요시 유지)
  const sessionTokensMap = new Map<string, number>(); // 전체 기준

  // range 기준 집계용 별도 변수
  let chatbotRange = 0;
  let builderRange = 0;
  let boardRange = 0;

  const scenarioMapRange = new Map<string, { runs: number; tokens: number }>();

  for (const doc of usedSnap.docs) {
    const d = doc.data() as any;
    const amount = Number(d.amount ?? 0);
    if (!amount) continue;

    // createdAt 처리
    const createdAtRaw = d.createdAt;
    let createdAt: Date;
    if (createdAtRaw?.toDate) createdAt = createdAtRaw.toDate();
    else if (typeof createdAtRaw === "string" || typeof createdAtRaw === "number")
      createdAt = new Date(createdAtRaw);
    else continue;

    const usageType = d.usageType ?? "";
    const sessionId = d.sessionId ?? null;
    const source = (d.source as string | undefined) ?? "chatbot";

    // ---- KPI: 전체 로그 기준 ----
    totalTokens += amount;

    if (createdAt.toDateString() === now.toDateString()) {
      todayTokens += amount;
    }

    if (createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()) {
      monthTokens += amount;
    }

    // 기존 일자별 집계
    const label = formatLabel(createdAt);
    dailyMap.set(label, (dailyMap.get(label) ?? 0) + amount);

    // 시나리오별(전체) 집계 (usageType 기반)
    const scenarioNameAll = usageType || "(시나리오 없음)";
    const prevAll = scenarioMapAll.get(scenarioNameAll) ?? { runs: 0, tokens: 0 };
    scenarioMapAll.set(scenarioNameAll, {
      runs: prevAll.runs + 1,
      tokens: prevAll.tokens + amount,
    });

    // 세션별(전체) 집계
    if (sessionId) {
      const prev = sessionTokensMap.get(sessionId) ?? 0;
      sessionTokensMap.set(sessionId, prev + amount);
    }

    // ---- range 안에 들어오는지 먼저 판단 ----
    if (createdAt < rangeStart) continue;
    if (createdAt >= rangeEnd) continue;

    // 소스별 합계: range 기준
    if (source === "chatbot") chatbotRange += amount;
    else if (source === "builder") builderRange += amount;
    else if (source === "board") boardRange += amount;

    // 시나리오별 집계: range 기준
    const scenarioNameRange = usageType || "(시나리오 없음)";
    const prevRange = scenarioMapRange.get(scenarioNameRange) ?? { runs: 0, tokens: 0 };
    scenarioMapRange.set(scenarioNameRange, {
      runs: prevRange.runs + 1,
      tokens: prevRange.tokens + amount,
    });

    // ---- Line 차트용 버킷팅 (range 기준) ----
    if (range === "day") {
      const h = createdAt.getHours(); // 0~23
      chartBuckets[h] += amount;
    } else if (range === "week") {
      const weekday = createdAt.getDay(); // 0(일)~6(토)
      const idx = (weekday + 6) % 7; // 월(0)~일(6)
      chartBuckets[idx] += amount;
    } else if (range === "month") {
      const dayOfMonth = createdAt.getDate(); // 1~
      const idx = dayOfMonth - 1;
      if (idx >= 0 && idx < chartBuckets.length) chartBuckets[idx] += amount;
    } else {
      const m = createdAt.getMonth(); // 0~11
      chartBuckets[m] += amount;
    }
  }

  // 평균 세션당 토큰 (기존: 전체 기준 유지)
  const sessionCount = sessionTokensMap.size;
  const sumSessionTokens = Array.from(sessionTokensMap.values()).reduce((sum, v) => sum + v, 0);
  const avgTokensPerSession = sessionCount > 0 ? sumSessionTokens / sessionCount : 0;

  // topScenarios: range 기준으로 계산
  const topScenarios = Array.from(scenarioMapRange.entries())
    .map(([name, v]) => ({ name, runs: v.runs, tokens: v.tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  return NextResponse.json({
    user,
    todayTokens,
    monthTokens,
    totalTokens,
    avgTokensPerSession,
    daily: {
      labels: chartLabels,
      values: chartBuckets,
      range,
    },
    // sourceUsage: range 기준으로 내려줌 (프론트에서 select 변경 시 함께 변경됨)
    sourceUsage: {
      chatbot: chatbotRange,
      builder: builderRange,
      board: boardRange,
    },
    // topScenarios: range 기준
    topScenarios,
  });
}
