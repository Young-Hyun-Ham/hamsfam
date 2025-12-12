import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type Params = { params: { uid: string } };

function formatLabel(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { uid } = params;

  // 1) 사용자 정보
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  const u = userDoc.data() as any;

  const user = {
    id: userDoc.id,
    email: u.email ?? "",
    name: u.name ?? "",
    avatar_url: u.avatar_url ?? null,
  };

  // 2) 토큰 로그 조회 (최근 30일만 예시)
  const now = new Date();
  const since = new Date();
  since.setDate(now.getDate() - 30);

  const logsSnap = await adminDb
    .collection("token_logs")
    .where("userId", "==", uid)
    .where("createdAt", ">=", since)
    .get();

  let todayTokens = 0;
  let monthTokens = 0;
  let totalTokens = 0;

  let sessionCount = 0;
  const sessionTokensMap = new Map<string, number>();

  const dailyMap = new Map<string, number>();
  let firebaseTotal = 0;
  let postgresTotal = 0;

  const scenarioMap = new Map<string, { runs: number; tokens: number }>();

  for (const doc of logsSnap.docs) {
    const d = doc.data() as any;

    const used = Number(d.usedTokens ?? 0);
    const backend = d.backend ?? "firebase";
    const scenarioName = d.scenarioName ?? "(시나리오 미지정)";
    const createdAt: Date = d.createdAt?.toDate
      ? d.createdAt.toDate()
      : new Date(d.createdAt);

    totalTokens += used;

    // 오늘
    const isToday =
      createdAt.toDateString() === now.toDateString();
    if (isToday) {
      todayTokens += used;
    }

    // 이번달
    const isSameMonth =
      createdAt.getFullYear() === now.getFullYear() &&
      createdAt.getMonth() === now.getMonth();
    if (isSameMonth) {
      monthTokens += used;
    }

    // 일별 집계
    const label = formatLabel(createdAt);
    dailyMap.set(label, (dailyMap.get(label) ?? 0) + used);

    // 백엔드별 집계
    if (backend === "firebase") firebaseTotal += used;
    if (backend === "postgres") postgresTotal += used;

    // 시나리오별 집계
    const curScenario = scenarioMap.get(scenarioName) ?? {
      runs: 0,
      tokens: 0,
    };
    curScenario.runs += 1;
    curScenario.tokens += used;
    scenarioMap.set(scenarioName, curScenario);

    // 세션별 집계 (평균 세션당 토큰 계산용)
    if (d.sessionId) {
      const prev = sessionTokensMap.get(d.sessionId) ?? 0;
      sessionTokensMap.set(d.sessionId, prev + used);
    }
  }

  sessionCount = sessionTokensMap.size;
  const sumSessionTokens = Array.from(sessionTokensMap.values()).reduce(
    (sum, v) => sum + v,
    0
  );
  const avgTokensPerSession =
    sessionCount > 0 ? sumSessionTokens / sessionCount : 0;

  const dailyLabels = Array.from(dailyMap.keys()).sort();
  const dailyValues = dailyLabels.map((label) => dailyMap.get(label) ?? 0);

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
      labels: dailyLabels,
      values: dailyValues,
    },
    backendUsage: {
      firebase: firebaseTotal,
      postgres: postgresTotal, // 지금은 거의 0일 가능성 높음
    },
    topScenarios,
  });
}
