// src/lib/onboarding/program.builder.ts
import type { RecommendInput } from "./reco.types";
import { SUBTYPES_STEPS } from "./reco.data";

type StepOut = {
  id: string;
  title: string;
  seconds: number;
  imgSrc?: string;
  phase?: "warmup" | "main" | "cooldown";
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function getStepMeta(id: string) {
  return SUBTYPES_STEPS.find((s) => s.id === id);
}

// ✅ answers에서 "string[]"을 가장 먼저 찾는 헬퍼
function getArrayAnswer(a: any, keys: string[]): string[] {
  for (const k of keys) {
    const v = a?.[k];
    if (Array.isArray(v)) return v.filter(Boolean);
  }
  return [];
}

// ✅ 총 seconds를 그룹/아이템에 정확히 배분(오차 0)
function distribute(totalSeconds: number, ids: string[], minEach: number) {
  const n = ids.length;
  if (n <= 0) return [] as Array<{ id: string; seconds: number }>;

  const minTotal = n * minEach;
  const baseTotal = Math.max(totalSeconds, minTotal);

  const base = Math.floor(baseTotal / n);
  const rem = baseTotal - base * n;

  return ids.map((id, i) => ({
    id,
    seconds: i === n - 1 ? base + rem : base,
  }));
}

/**
 * ✅ start/main/finish 선택 step으로 “시간만 재분배”한 결과를
 * 기존 RecommendationOutput 구조로 만들어 반환
 */
export function buildProgramOutput(input: RecommendInput) {
  const a: any = input.answers ?? {};

  const totalMin = Number(a.q_program_time ?? input.constraints?.time_min ?? 15) || 15;
  const totalSec = clamp(Math.round(totalMin * 60), 60, 60 * 180); // 1분~180분

  // ✅ 여기! 질문 id가 바뀌어도 대응되게 후보를 넉넉히 잡는다.
  const startIds = getArrayAnswer(a, [
    "q_program_start_stretch",
  ]);

  const mainIds = getArrayAnswer(a, [
    "q_program_main_steps",
  ]);

  const finishIds = getArrayAnswer(a, [
    "q_program_finish_stretch",
  ]);

  // ✅ 비율(기본): 20 / 60 / 20
  // 선택이 비어있는 그룹은 자동으로 나머지 그룹에 재분배
  const groupsAll = [
    { key: "warmup" as const, ids: startIds, w: 0.2 },
    { key: "main" as const, ids: mainIds, w: 0.6 },
    { key: "cooldown" as const, ids: finishIds, w: 0.2 },
  ];

  const groups = groupsAll.filter((g) => g.ids.length > 0);

  if (groups.length === 0) {
    return {
      generated_subtypes: [],
      top_picks: [],
      alternatives: [],
      meta: {
        computed_tags_top: [],
        explain: "program 선택이 비어있음",
      },
    };
  }

  const weightSum = groups.reduce((acc, g) => acc + g.w, 0);
  const normalized = groups.map((g) => ({ ...g, w: g.w / weightSum }));

  // 그룹별 초 배분 (마지막 그룹에 잔여 몰아서 총합 정확히)
  let remaining = totalSec;
  const groupSec = normalized.map((g, idx) => {
    const sec = idx === normalized.length - 1 ? remaining : Math.floor(totalSec * g.w);
    remaining -= sec;
    return { ...g, sec };
  });

  // step별 분배(각 step 최소 30초)
  const MIN_EACH = 30;

  const steps: StepOut[] = [];
  for (const g of groupSec) {
    const parts = distribute(g.sec, g.ids, MIN_EACH);

    for (const p of parts) {
      const meta = getStepMeta(p.id);

      steps.push({
        id: p.id,
        title: meta?.name ?? p.id,
        seconds: p.seconds,
        imgSrc: (meta as any)?.imgSrc ?? (meta as any)?.imgsrc ?? `/workouts/${p.id}.png`,
        phase: g.key,
      });
    }
  }

  const routine = {
    duration_min: Math.round(steps.reduce((acc, s) => acc + s.seconds, 0) / 60),
    level: (input.context as any)?.experience_level ?? "beginner",
    steps,
  };

  return {
    generated_subtypes: [],
    top_picks: [
      {
        subtype_id: "program_custom",
        subtype_name: "내가 선택한 프로그램",
        score: 1,
        confidence: 1,
        reasons: [{ tag: "program", why: "선택한 step들로 시간만 재분배해서 바로 플레이해요." }],
        warnings: [],
        routine,
        copy: {
          title: "내가 선택한 프로그램",
          summary: "선택한 운동 구성으로 총 시간을 자동 배분했어요.",
        },
      },
    ],
    alternatives: [],
    meta: {
      computed_tags_top: [],
      explain: "program 모드: 사용자 선택 step 기반 시간 재분배",
    },
  };
}
