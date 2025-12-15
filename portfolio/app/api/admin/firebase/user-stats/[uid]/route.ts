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
  const range: RangeUnit = ["day", "week", "month", "year"].includes(
    rangeParam,
  )
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
  let rangeEnd: Date | null = null;

  if (range === "day") {
    // 오늘 00:00 ~ 내일 00:00, 24시간
    rangeStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    rangeEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    chartLabels = Array.from({ length: 24 }, (_, h) =>
      `${String(h).padStart(2, "0")}:00`,
    );
  } else if (range === "week") {
    // 이번 주 월요일 00시 ~ 다음 주 월요일 00시
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const day = startOfToday.getDay(); // 0:일 ~ 6:토
    const diffToMonday = (day + 6) % 7; // 월요일(1)을 기준으로
    rangeStart = new Date(startOfToday);
    rangeStart.setDate(startOfToday.getDate() - diffToMonday);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeStart.getDate() + 7);
    chartLabels = ["월", "화", "수", "목", "금", "토", "일"];
  } else if (range === "month") {
    // 이번 달 1일 00시 ~ 다음 달 1일 00시
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    rangeEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    chartLabels = Array.from({ length: daysInMonth }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    );
  } else {
    // year: 올해 1월 1일 ~ 내년 1월 1일
    rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
    chartLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
  }

  chartBuckets = new Array(chartLabels.length).fill(0);

  // ---------- KPI/소스/시나리오/세션 집계 ----------
  let todayTokens = 0;
  let monthTokens = 0;
  let totalTokens = 0;

  const dailyMap = new Map<string, number>(); // 기존 formatLabel 용 (필요하면 유지)
  const scenarioMap = new Map<string, { runs: number; tokens: number }>();
  const sessionTokensMap = new Map<string, number>();

  let chatbotTotal = 0;
  let builderTotal = 0;
  let boardTotal = 0;

  for (const doc of usedSnap.docs) {
    const d = doc.data() as any;
    const amount = Number(d.amount ?? 0);
    if (!amount) continue;

    // createdAt 처리
    const createdAtRaw = d.createdAt;
    let createdAt: Date;
    if (createdAtRaw?.toDate) {
      createdAt = createdAtRaw.toDate();
    } else if (
      typeof createdAtRaw === "string" ||
      typeof createdAtRaw === "number"
    ) {
      createdAt = new Date(createdAtRaw);
    } else {
      continue;
    }

    const usageType = d.usageType ?? "";
    const sessionId = d.sessionId ?? null;
    const source = (d.source as string | undefined) ?? "chatbot";

    // ---- KPI: 전체 로그 기준 ----
    totalTokens += amount;

    // 오늘
    if (createdAt.toDateString() === now.toDateString()) {
      todayTokens += amount;
    }

    // 이번 달
    if (
      createdAt.getFullYear() === now.getFullYear() &&
      createdAt.getMonth() === now.getMonth()
    ) {
      monthTokens += amount;
    }

    // 기존 일자별 집계 (필요하면 계속 사용)
    const label = formatLabel(createdAt);
    dailyMap.set(label, (dailyMap.get(label) ?? 0) + amount);

    // 소스별 합계
    if (source === "chatbot") chatbotTotal += amount;
    else if (source === "builder") builderTotal += amount;
    else if (source === "board") boardTotal += amount;

    // 시나리오별 집계 (usageType 기반)
    const scenarioName = usageType || "(시나리오 없음)";
    const prevScenario = scenarioMap.get(scenarioName) ?? {
      runs: 0,
      tokens: 0,
    };
    scenarioMap.set(scenarioName, {
      runs: prevScenario.runs + 1,
      tokens: prevScenario.tokens + amount,
    });

    // 세션별 집계
    if (sessionId) {
      const prev = sessionTokensMap.get(sessionId) ?? 0;
      sessionTokensMap.set(sessionId, prev + amount);
    }

    // ---- Line 차트용 버킷팅 (선택한 range 기준) ----
    if (createdAt < rangeStart) continue;
    if (rangeEnd && createdAt >= rangeEnd) continue;

    if (range === "day") {
      // 오늘 날짜만, 시간별
      const sameDay =
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate();
      if (!sameDay) continue;
      const h = createdAt.getHours(); // 0~23
      chartBuckets[h] += amount;
    } else if (range === "week") {
      const weekday = createdAt.getDay(); // 0(일)~6(토)
      const idx = (weekday + 6) % 7; // 월(0)~일(6)
      chartBuckets[idx] += amount;
    } else if (range === "month") {
      if (
        createdAt.getFullYear() !== now.getFullYear() ||
        createdAt.getMonth() !== now.getMonth()
      ) {
        continue;
      }
      const dayOfMonth = createdAt.getDate(); // 1~
      const idx = dayOfMonth - 1;
      if (idx >= 0 && idx < chartBuckets.length) {
        chartBuckets[idx] += amount;
      }
    } else if (range === "year") {
      if (createdAt.getFullYear() !== now.getFullYear()) continue;
      const m = createdAt.getMonth(); // 0~11
      chartBuckets[m] += amount;
    }
  }

  const sessionCount = sessionTokensMap.size;
  const sumSessionTokens = Array.from(sessionTokensMap.values()).reduce(
    (sum, v) => sum + v,
    0,
  );
  const avgTokensPerSession =
    sessionCount > 0 ? sumSessionTokens / sessionCount : 0;

  const topScenarios = Array.from(scenarioMap.entries())
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
      range, // 참고용
    },
    sourceUsage: {
      chatbot: chatbotTotal,
      builder: builderTotal,
      board: boardTotal,
    },
    topScenarios,
  });
}
