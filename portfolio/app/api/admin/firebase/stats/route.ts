// app/api/admin/firebase/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type BackendKey = "firebase" | "postgres";
type RangeKey = "recent7" | "day" | "week" | "month";

const FALLBACK_NO_INDEX_MODE = true;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function addMonthsStart(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 0, 0, 0, 0);
}
function startOfWeekMonday(d: Date) {
  const base = startOfDay(d);
  const day = base.getDay(); // 0(일)~6(토)
  const diffToMonday = (day + 6) % 7; // 월요일 기준
  return addDays(base, -diffToMonday);
}
function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v === "number" || typeof v === "string") {
    const dt = new Date(v);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}
function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function uidFromDocPath(docPath: string) {
  const parts = docPath.split("/");
  const idx = parts.indexOf("user_token");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}
function inRange(dt: Date, start: Date, end: Date) {
  return dt >= start && dt < end;
}

function parseRange(searchParams: URLSearchParams): RangeKey {
  const r = (searchParams.get("range") || "recent7") as RangeKey;
  if (r === "day" || r === "week" || r === "month" || r === "recent7") return r;
  return "recent7";
}

// anchor
// - day/week: YYYY-MM-DD
// - month: YYYY-MM
function parseAnchor(searchParams: URLSearchParams, range: RangeKey): Date {
  const a = (searchParams.get("anchor") || "").trim();
  const now = new Date();
  if (!a) return now;

  if (range === "month") {
    // YYYY-MM
    const [y, m] = a.split("-").map((x) => Number(x));
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      return new Date(y, m - 1, 1);
    }
    return now;
  }

  // YYYY-MM-DD
  const dt = new Date(a);
  return Number.isNaN(dt.getTime()) ? now : dt;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const range = parseRange(searchParams);
    const anchor = parseAnchor(searchParams, range);

    const now = new Date();
    const 기준시각 = now.toISOString();

    // -----------------------------
    // ✅ 선택 범위 계산
    // -----------------------------
    let rangeStart: Date;
    let rangeEnd: Date;

    // 라인차트 label/bucket 정의
    let chartLabels: string[] = [];
    let chartBuckets: number[] = [];

    if (range === "recent7") {
      const todayStart = startOfDay(now);
      const tomorrowStart = addDays(todayStart, 1);
      rangeStart = addDays(todayStart, -6);
      rangeEnd = tomorrowStart;

      chartLabels = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(rangeStart, i);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${mm}-${dd}`;
      });
      chartBuckets = new Array(7).fill(0);
    } else if (range === "day") {
      const dayStart = startOfDay(anchor);
      rangeStart = dayStart;
      rangeEnd = addDays(dayStart, 1);

      chartLabels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
      chartBuckets = new Array(24).fill(0);
    } else if (range === "week") {
      const weekStart = startOfWeekMonday(anchor);
      rangeStart = weekStart;
      rangeEnd = addDays(weekStart, 7);

      chartLabels = ["월", "화", "수", "목", "금", "토", "일"];
      chartBuckets = new Array(7).fill(0);
    } else {
      // month
      const monthStart = startOfMonth(anchor);
      rangeStart = monthStart;
      rangeEnd = addMonthsStart(monthStart, 1);

      const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      chartLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0"));
      chartBuckets = new Array(daysInMonth).fill(0);
    }

    // -----------------------------
    // ✅ users count
    // -----------------------------
    const usersSnap = await adminDb.collection("users").get();
    const totalUsers = usersSnap.size;

    // -----------------------------
    // ✅ used docs 읽기
    // -----------------------------
    let usedDocs: Array<{ path: string; data: any }> = [];

    if (!FALLBACK_NO_INDEX_MODE) {
      // 인덱스 모드
      const snap = await adminDb
        .collectionGroup("used")
        .where("createdAt", ">=", rangeStart)
        .where("createdAt", "<", rangeEnd)
        .orderBy("createdAt", "asc")
        .get();

      usedDocs = snap.docs.map((d) => ({ path: d.ref.path, data: d.data() }));
    } else {
      // 우회 모드
      const snap = await adminDb.collectionGroup("used").get();
      usedDocs = snap.docs.map((d) => ({ path: d.ref.path, data: d.data() }));
    }

    // -----------------------------
    // ✅ KPI/집계
    // -----------------------------
    let todayTokens = 0;
    let monthTokens = 0;
    let totalTokens = 0;

    const activeUserSet = new Set<string>();
    const sessionTokensMap = new Map<string, number>();

    // ✅ sourceUsage (범위 기준)
    const sourceUsage7d: Record<"chatbot" | "builder" | "board", number> = {
      chatbot: 0,
      builder: 0,
      board: 0,
    };

    const userTokenMap = new Map<string, number>();
    const scenarioMap = new Map<string, { runs: number; tokens: number }>();

    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const thisMonthStart = startOfMonth(now);
    const nextMonthStart = addMonthsStart(thisMonthStart, 1);

    for (const row of usedDocs) {
      const d = row.data as any;
      const amount = safeNum(d.amount ?? 0);
      if (!amount) continue;

      const createdAt = toDate(d.createdAt);
      if (!createdAt) continue;

      // 전체 누적(전체 로그 기준)
      totalTokens += amount;

      // 오늘/이번달 KPI는 "현재 기준"으로 고정 (요구사항상 통계 전체가 선택 날짜로 바뀌길 원하면 아래를 rangeStart 기준으로 바꿀 수 있음)
      if (inRange(createdAt, todayStart, tomorrowStart)) todayTokens += amount;
      if (inRange(createdAt, thisMonthStart, nextMonthStart)) monthTokens += amount;

      // 선택 범위 필터(선택 기준으로 모든 통계 변경)
      if (!inRange(createdAt, rangeStart, rangeEnd)) continue;

      // active users
      const uid = uidFromDocPath(row.path);
      if (uid) activeUserSet.add(uid);

      // source usage (선택 범위 기준)
      const source = String(d.source ?? "chatbot").toLowerCase();
      if (source === "builder") sourceUsage7d.builder += amount;
      else if (source === "board") sourceUsage7d.board += amount;
      else sourceUsage7d.chatbot += amount;

      // top users (선택 범위)
      if (uid) userTokenMap.set(uid, (userTokenMap.get(uid) ?? 0) + amount);

      // top scenarios (선택 범위)
      const scenarioName = String(d.usageType ?? "(시나리오 없음)");
      const prev = scenarioMap.get(scenarioName) ?? { runs: 0, tokens: 0 };
      scenarioMap.set(scenarioName, { runs: prev.runs + 1, tokens: prev.tokens + amount });

      // avg tokens per session (선택 범위)
      const sessionId = d.sessionId ? String(d.sessionId) : "";
      if (sessionId) sessionTokensMap.set(sessionId, (sessionTokensMap.get(sessionId) ?? 0) + amount);

      // line chart bucket (선택 범위)
      if (range === "recent7") {
        const dayIndex = Math.floor(
          (startOfDay(createdAt).getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (dayIndex >= 0 && dayIndex < chartBuckets.length) chartBuckets[dayIndex] += amount;
      } else if (range === "day") {
        const h = createdAt.getHours();
        chartBuckets[h] += amount;
      } else if (range === "week") {
        const weekday = createdAt.getDay(); // 0(일)~6(토)
        const idx = (weekday + 6) % 7; // 월(0)~일(6)
        chartBuckets[idx] += amount;
      } else if (range === "month") {
        const idx = createdAt.getDate() - 1;
        if (idx >= 0 && idx < chartBuckets.length) chartBuckets[idx] += amount;
      }
    }

    const sessionCount = sessionTokensMap.size;
    const sumSessionTokens = Array.from(sessionTokensMap.values()).reduce((a, b) => a + b, 0);
    const avgTokensPerSession = sessionCount > 0 ? sumSessionTokens / sessionCount : 0;

    const topUsersRaw = Array.from(userTokenMap.entries())
      .map(([uid, tokens]) => ({ uid, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    const topUserDocs = await Promise.all(
      topUsersRaw.map((r) => adminDb.collection("users").doc(r.uid).get()),
    );

    const topUsers = topUsersRaw.map((r, idx) => {
      const doc = topUserDocs[idx];
      const u = doc.exists ? (doc.data() as any) : {};
      return {
        id: r.uid,
        name: u?.name ?? u?.email ?? r.uid,
        email: u?.email ?? "",
        avatar_url: u?.avatar_url ?? null,
        tokens: r.tokens,
      };
    });

    const topScenarios = Array.from(scenarioMap.entries())
      .map(([name, v]) => ({ name, runs: v.runs, tokens: v.tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    return NextResponse.json({
      ok: true,
      기준시각,
      range,
      anchor: anchor.toISOString(),
      kpi: {
        // ✅ “선택 날짜로 전부 변경”에 맞추려면 todayTokens/monthTokens도 선택 범위 기준으로 바꾸는 게 자연스러움.
        // 일단 네 화면 KPI는 그대로 유지(오늘/이번달/누적/평균세션) 형태라서 아래처럼 반환
        todayTokens,
        monthTokens,
        totalTokens,
        avgTokensPerSession,
        totalUsers,
        activeUsers: activeUserSet.size,
      },
      line: {
        labels: chartLabels,
        values: chartBuckets,
      },
      sourceUsage: sourceUsage7d,
      topUsers,
      topScenarios,
    });
  } catch (e: any) {
    console.error("stats error:", {
      code: e?.code,
      message: e?.message,
      details: e?.details,
      stack: e?.stack,
    });
    return NextResponse.json(
      { ok: false, code: e?.code, message: e?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
