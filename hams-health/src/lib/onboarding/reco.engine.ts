// src/lib/onboarding/reco.engine.ts
import type {
  RecommendInput,
  RecommendationOutput,
  RecommendationPick,
  Routine,
  RoutineStepResolved,
  InjuryFlags,
  StepPoolItem,
  StepPhase,
  ExperienceLevel,
} from "./reco.types";
import {
  ANSWER_TO_TAG_WEIGHTS,
  COPY_TEMPLATES,
  REASON_SENTENCE_MAP,
  WORKOUT_SUBTYPES,
  SUBTYPES_STEPS,
  type WorkoutSubtype,
} from "./reco.data";

/** ---------- utils ---------- */
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

type TagScoreMap = Record<string, number>; // ✅ 엔진 내부 계산은 느슨하게(타입 충돌 방지)

function sumObj(o: TagScoreMap) {
  return Object.values(o).reduce((a, b) => a + b, 0);
}

function pickTopTags(tagScores: TagScoreMap, n = 7) {
  return Object.entries(tagScores)
    .map(([tag, score]) => ({ tag, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/** ---------- scoring helpers (기존 로직 유지) ---------- */
function normalizeWeights(scores: TagScoreMap) {
  const total = sumObj(scores) || 1;
  const out: TagScoreMap = {};
  for (const [k, v] of Object.entries(scores)) out[k] = v / total;
  return out;
}

function applyPatch(
  baseAdd: TagScoreMap,
  baseAvoid: TagScoreMap,
  patch?: { add?: Record<string, number>; avoid?: Record<string, number> }
) {
  if (!patch) return;
  if (patch.add) {
    for (const [k, v] of Object.entries(patch.add)) baseAdd[k] = (baseAdd[k] ?? 0) + v;
  }
  if (patch.avoid) {
    for (const [k, v] of Object.entries(patch.avoid)) baseAvoid[k] = (baseAvoid[k] ?? 0) + v;
  }
}

function tagMatchScore(userAdd: TagScoreMap, subtypeTags: string[]) {
  const set = new Set(subtypeTags);
  let sum = 0;
  for (const [tag, v] of Object.entries(userAdd)) {
    if (set.has(tag)) sum += v;
  }
  return sum;
}

function avoidPenalty(userAvoid: TagScoreMap, subtypeTags: string[]) {
  const set = new Set(subtypeTags);
  let sum = 0;
  for (const [tag, v] of Object.entries(userAvoid)) {
    if (set.has(tag)) sum += v;
  }
  return sum;
}

function matchesEquipment(userEquip: string[] | undefined, subtypeEquip: string[]) {
  if (!userEquip?.length) return 0.1;
  const u = new Set(userEquip);
  const s = new Set(subtypeEquip);

  if (u.has("none")) {
    if (s.has("none")) return 1.1;
    return -0.9;
  }

  let inter = 0;
  for (const e of u) if (s.has(e)) inter++;
  return inter > 0 ? 0.8 : -0.3;
}

function matchesSpace(userSpace: string | undefined, subtypeSpace: string) {
  if (!userSpace || userSpace === "any") return 0.2;
  if (userSpace === subtypeSpace) return 0.6;
  if (userSpace === "small" && subtypeSpace !== "small" && subtypeSpace !== "any") return -0.6;
  return -0.2;
}

function matchesNoise(userNoise: string | undefined, subtypeNoise: string) {
  if (!userNoise) return 0.1;
  const order = ["silent", "low", "medium", "high"];
  const ui = order.indexOf(userNoise);
  const si = order.indexOf(subtypeNoise);
  if (ui === -1 || si === -1) return 0;

  if (si > ui) return -0.6;
  return 0.3;
}

function injuryPenalty(flags: InjuryFlags | undefined, contraTags: string[] | undefined) {
  if (!flags || !contraTags?.length) return 0;
  let p = 0;
  const set = new Set(contraTags);
  for (const [k, on] of Object.entries(flags)) {
    if (!on) continue;
    if (set.has(k)) p += 0.9;
  }
  return p;
}

function goalBonus(goals: string[] | undefined, subtypeGoals: string[]) {
  if (!goals?.length) return 0.1;
  const g = new Set(goals);
  let hit = 0;
  for (const sg of subtypeGoals) if (g.has(sg)) hit++;
  return clamp(hit * 0.35, 0, 1.05);
}

function confidenceFromScore(score: number, scores: number[]) {
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max === min) return 0.6;
  const norm = (score - min) / (max - min);
  return clamp(0.55 + norm * 0.4, 0.55, 0.95);
}

/** ---------- step meta (SUBTYPES_STEPS) ---------- */
const stepMetaMap = new Map(
  SUBTYPES_STEPS.map((s: any) => [
    s.id,
    {
      title: s.name,
      imgSrc: s.imgsrc || `/workouts/${s.id}.png`, // ✅ reco.data.ts 기준(imgsrc)
    },
  ])
);

function resolveStepMeta(stepId: string, fallbackTitle: string) {
  const meta = stepMetaMap.get(stepId);
  return {
    title: meta?.title ?? fallbackTitle,
    imgSrc: meta?.imgSrc ?? `/workouts/${stepId}.png`,
  };
}

/** ---------- dynamic routine builder (신규 핵심) ---------- */
function isStepAllowed(step: StepPoolItem, injuryFlags?: InjuryFlags) {
  if (!injuryFlags) return true;
  const contra = step.contra_tags ?? [];
  for (const [k, on] of Object.entries(injuryFlags)) {
    if (!on) continue;
    if (contra.includes(k as any)) return false;
  }
  return true;
}

function scoreStep(step: StepPoolItem, topTags: string[], wantedGoals: string[]) {
  let s = 0;

  const p = new Set(step.profile_tags ?? []);
  for (const t of topTags) if (p.has(t as any)) s += 2;

  const g = new Set(step.goals ?? []);
  for (const goal of wantedGoals) if (g.has(goal)) s += 1;

  s *= step.weight ?? 1;
  return s;
}

function pickTopSteps(args: {
  pool: StepPoolItem[];
  phase: StepPhase;
  count: number;
  topTags: string[];
  goals: string[];
  injuryFlags?: InjuryFlags;
}) {
  const { pool, phase, count, topTags, goals, injuryFlags } = args;

  const scored = pool
    .filter((s) => s.phase === phase)
    .filter((s) => isStepAllowed(s, injuryFlags))
    .map((s) => ({ s, score: scoreStep(s, topTags, goals) }))
    .sort((a, b) => b.score - a.score);

  const out: StepPoolItem[] = [];
  const used = new Set<string>();
  for (const it of scored) {
    if (out.length >= count) break;
    if (used.has(it.s.key)) continue;
    used.add(it.s.key);
    out.push(it.s);
  }
  return out;
}

function phaseBudget(wantedMin: number, topTags: string[]) {
  const timeCrunched = topTags.includes("time_crunched");
  const followAlong = topTags.includes("follow_along");
  const lowPressure = topTags.includes("low_pressure");

  let warmup = 0.2;
  let cooldown = 0.2;
  let finisher = 0.15;
  let main = 0.45;

  if (timeCrunched) {
    warmup -= 0.05;
    cooldown -= 0.05;
    main += 0.10;
  }
  if (followAlong) {
    finisher -= 0.05;
    main += 0.05;
  }
  if (lowPressure) {
    finisher -= 0.05;
    cooldown += 0.05;
  }

  const sum = warmup + cooldown + finisher + main;
  warmup /= sum;
  cooldown /= sum;
  finisher /= sum;
  main /= sum;

  return {
    warmup: Math.max(1, Math.round(wantedMin * warmup)),
    main: Math.max(1, Math.round(wantedMin * main)),
    finisher: Math.max(0, Math.round(wantedMin * finisher)),
    cooldown: Math.max(1, Math.round(wantedMin * cooldown)),
  };
}

/**
 * ✅ 기존 allocateMinutes는 {name,min}을 만들었는데
 * 이제 RoutineStepResolved(id,seconds,title,imgSrc,phase)로 반환한다.
 *
 * - step_pool의 key를 stepId로 취급 (SUBTYPES_STEPS.id와 일치한다는 전제)
 * - minutes -> seconds 변환
 */
function allocateSeconds(steps: StepPoolItem[], budgetMin: number): RoutineStepResolved[] {
  if (steps.length === 0) return [];

  const mins = steps.map((s) => clamp(s.default_min, s.min_range[0], s.min_range[1]));
  let sum = mins.reduce((a, b) => a + b, 0);

  while (sum < budgetMin) {
    let progressed = false;
    for (let i = 0; i < steps.length && sum < budgetMin; i++) {
      const max = steps[i].min_range[1];
      if (mins[i] < max) {
        mins[i]++;
        sum++;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  while (sum > budgetMin) {
    let progressed = false;
    for (let i = 0; i < steps.length && sum > budgetMin; i++) {
      const min = steps[i].min_range[0];
      if (mins[i] > min) {
        mins[i]--;
        sum--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return steps.map((s, i) => {
    const id = s.key; // ✅ stepId
    const seconds = Math.max(1, mins[i]) * 60;
    const meta = resolveStepMeta(id, s.name);

    return {
      id,
      seconds,
      phase: s.phase,
      title: meta.title,
      imgSrc: meta.imgSrc,
    };
  });
}

function buildDynamicRoutine(args: {
  subtype: WorkoutSubtype;
  wantedMin: number;
  level: ExperienceLevel;
  topTags: string[];
  injuryFlags?: InjuryFlags;
}): Routine {
  const { subtype, wantedMin, level, topTags, injuryFlags } = args;

  const pool = subtype.step_pool ?? [];
  const budgets = phaseBudget(wantedMin, topTags);

  const warmups = pickTopSteps({
    pool,
    phase: "warmup",
    count: 1,
    topTags,
    goals: subtype.goals ?? [],
    injuryFlags,
  });

  const mains = pickTopSteps({
    pool,
    phase: "main",
    count: 3,
    topTags,
    goals: subtype.goals ?? [],
    injuryFlags,
  });

  const finishers =
    budgets.finisher > 0
      ? pickTopSteps({
          pool,
          phase: "finisher",
          count: 1,
          topTags,
          goals: subtype.goals ?? [],
          injuryFlags,
        })
      : [];

  const cooldowns = pickTopSteps({
    pool,
    phase: "cooldown",
    count: 1,
    topTags,
    goals: subtype.goals ?? [],
    injuryFlags,
  });

  const steps: RoutineStepResolved[] = [
    ...allocateSeconds(warmups, budgets.warmup),
    ...allocateSeconds(mains, budgets.main),
    ...allocateSeconds(finishers, budgets.finisher),
    ...allocateSeconds(cooldowns, budgets.cooldown),
  ];

  const duration_min = Math.max(1, Math.round(steps.reduce((a, b) => a + b.seconds, 0) / 60));
  return { duration_min, level, steps };
}

/** ✅ 템플릿 fallback(legacy name/min)을 resolved로 변환 */
function resolveLegacyTemplateSteps(picked: any): RoutineStepResolved[] {
  const rawSteps = picked?.steps ?? [];
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    const meta = resolveStepMeta("stretch", "스트레칭");
    return [
      {
        id: "stretch",
        seconds: Math.max(1, Number(picked?.duration_min ?? 10)) * 60,
        phase: "cooldown",
        title: meta.title,
        imgSrc: meta.imgSrc,
      },
    ];
  }

  return rawSteps.map((st: any) => {
    const name = st?.name ?? "스트레칭";
    const min = Math.max(1, Number(st?.min ?? 1));
    // ✅ name으로 SUBTYPES_STEPS에서 id 역매칭 시도
    const found = SUBTYPES_STEPS.find((x: any) => x.name === name);
    const id = found?.id ?? name; // 못 찾으면 name을 임시 id로 사용(최후)
    const meta = resolveStepMeta(id, name);
    return {
      id,
      seconds: min * 60,
      phase: undefined,
      title: meta.title,
      imgSrc: meta.imgSrc,
    };
  });
}

function scaleLegacyTemplateSteps(
  picked: { steps: { name: string; min: number }[]; duration_min: number },
  wantedMin: number
): RoutineStepResolved[] {
  const baseMin = Math.max(1, Number(picked.duration_min ?? 1));
  const targetMin = Math.max(1, Number(wantedMin ?? baseMin));
  const rawSteps = picked.steps ?? [];

  // 1) 비율로 분배
  const mins = rawSteps.map((st) => Math.max(1, Math.round((st.min * targetMin) / baseMin)));

  // 2) 라운딩 오차 보정(총합을 정확히 targetMin으로)
  let sum = mins.reduce((a, b) => a + b, 0);
  const diff = targetMin - sum;
  if (mins.length) mins[mins.length - 1] = Math.max(1, mins[mins.length - 1] + diff);

  // 3) RoutineStepResolved로 변환
  return rawSteps.map((st, i) => {
    const name = st?.name ?? "스트레칭";
    const found = SUBTYPES_STEPS.find((x: any) => x.name === name);
    const id = found?.id ?? name;
    const meta = resolveStepMeta(id, name);

    return {
      id,
      seconds: mins[i] * 60,
      phase: undefined,
      title: meta.title,
      imgSrc: meta.imgSrc,
    };
  });
}

function pickRoutine(args: {
  subtype: WorkoutSubtype;
  wantedMin: number;
  level: ExperienceLevel;
  topTags: string[];
  injuryFlags?: InjuryFlags;
}): Routine {
  const { subtype, wantedMin, level, topTags, injuryFlags } = args;

  if (subtype.step_pool?.length) {
    return buildDynamicRoutine({ subtype, wantedMin, level, topTags, injuryFlags });
  }

  const templates = subtype.session_templates ?? [];
  if (!templates.length) {
    const meta = resolveStepMeta("stretch", "스트레칭");
    return {
      duration_min: wantedMin,
      level,
      steps: [
        { id: "stretch", seconds: wantedMin * 60, phase: "cooldown", title: meta.title, imgSrc: meta.imgSrc },
      ],
    };
  }

  const sorted = [...templates].sort((a, b) => a.duration_min - b.duration_min);
  const candidates = sorted.filter((t) => t.duration_min <= wantedMin);
  const picked = candidates.length ? candidates[candidates.length - 1] : sorted[0];

  const steps = 
  picked.duration_min < wantedMin
    ? scaleLegacyTemplateSteps(picked as any, wantedMin)
    : resolveLegacyTemplateSteps(picked);
  const duration_min = 
  picked.duration_min < wantedMin
    ? wantedMin
    : (picked.duration_min ?? Math.max(1, Math.round(steps.reduce((a, b) => a + b.seconds, 0) / 60)));

  return {
    duration_min,
    level: (picked.level ?? level) as any,
    steps,
  };
}

/** ---------- copy/reason ---------- */
function buildReasons(topTags: { tag: string; score: number }[]) {
  return topTags.slice(0, 3).map((t) => ({
    tag: t.tag,
    why: (REASON_SENTENCE_MAP as any)?.[t.tag] ?? "현재 성향과 잘 맞는 포인트예요.",
  }));
}

function buildCopy(subtype: WorkoutSubtype, reasons: { tag: string; why: string }[]) {
  const base = (COPY_TEMPLATES as any)?.[subtype.id] ?? (COPY_TEMPLATES as any)?.default;

  const title = base?.title ?? `${subtype.name} 추천`;
  const summary = base?.summary ?? "현재 성향/환경에 맞춰 부담 없이 실행할 수 있어요.";
  const reason_lines = reasons.map((r) => r.why);

  return { title, summary, reason_lines };
}

/** ---------- main export ---------- */
export function recommendWorkouts(input: RecommendInput): RecommendationOutput {
  const { answers, goals, constraints, context } = input;

  // ✅ ProfileTagScores 엄격 타입 대신 내부 계산은 TagScoreMap으로
  const add: TagScoreMap = {};
  const avoid: TagScoreMap = {};

  for (const [qid, aid] of Object.entries(answers ?? {})) {
    const patch = (ANSWER_TO_TAG_WEIGHTS as any)?.[qid]?.[aid];
    applyPatch(add, avoid, patch);
  }

  const addN = normalizeWeights(add);
  const avoidN = normalizeWeights(avoid);

  const topTags = pickTopTags(addN, 8);
  const topTagNames = topTags.map((t) => t.tag);

  const wantedMin = constraints?.time_min ?? 15;
  const injuryFlags = constraints?.injury_flags;

  const scored = WORKOUT_SUBTYPES.map((subtype: WorkoutSubtype) => {
    const s1 = tagMatchScore(addN, subtype.profile_tags ?? []);
    const s2 = avoidPenalty(avoidN, subtype.profile_tags ?? []);

    const eq = matchesEquipment(constraints?.equipment, subtype.equipment ?? []);
    const sp = matchesSpace(constraints?.space, subtype.space ?? "any");
    const nz = matchesNoise(constraints?.noise_level, subtype.noise_level ?? "low");

    const inj = injuryPenalty(injuryFlags, subtype.contra_tags);
    const gb = goalBonus(goals, subtype.goals ?? []);

    const score = s1 - s2 + eq + sp + nz + gb - inj;
    return { subtype, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const scoresOnly = scored.map((x) => x.score);

  const level: ExperienceLevel =
    context?.experience_level === "advanced"
      ? "advanced"
      : context?.experience_level === "intermediate"
      ? "intermediate"
      : "beginner";

  const top3 = scored.slice(0, 3).map((x): RecommendationPick => {
    const subtype = x.subtype;

    const routine = pickRoutine({
      subtype,
      wantedMin,
      level,
      topTags: topTagNames,
      injuryFlags,
    });

    const reasons = buildReasons(topTags);
    const copy = buildCopy(subtype, reasons);

    return {
      subtype_id: subtype.id,
      subtype_name: subtype.name,
      score: Number(x.score.toFixed(3)),
      confidence: confidenceFromScore(x.score, scoresOnly),
      reasons,
      routine,
      copy,
      warnings: [],
    };
  });

  const alternatives = scored.slice(3, 10).map((x) => {
    const subtype = x.subtype;

    const routine = pickRoutine({
      subtype,
      wantedMin,
      level,
      topTags: topTagNames,
      injuryFlags,
    });

    return {
      subtype_id: subtype.id,
      subtype_name: subtype.name,
      score: Number(x.score.toFixed(3)),
      why_short: "성향/제약 조건과 무난하게 맞는 대안",
      routine, // ✅ 추가
    };
  });

  return {
    // ✅ 추가: 폴백 시엔 정적 WORKOUT_SUBTYPES를 그대로 넣어준다(구조적 타입 호환)
    generated_subtypes: WORKOUT_SUBTYPES as any,

    top_picks: top3,
    alternatives,
    meta: {
      computed_tags_top: [
        ...(goals ?? []).slice(0, 5).map((g, i) => ({ tag: `goal:${g}`, score: 10 - i })),
        ...(topTagNames ?? []).slice(0, 7).map((t, i) => ({ tag: `profile:${t}`, score: 8 - i })),
      ].slice(0, 5),
      explain: "LLM 실패로 폴백 엔진이 정적 subtype 데이터로 루틴을 구성했습니다.",
    },
  };
}

// ==========================================================================================
// ✅ LLM plan 기반 추천 (최종 출력은 기존 RecommendationOutput 유지)
import type { RecoPlanBase } from "./reco.types";

export function recommendFromPlan(input: RecommendInput, plan: RecoPlanBase): RecommendationOutput {
  const goals = plan.goals?.length ? plan.goals : input.goals ?? [];
  const constraints = plan.constraints ?? (input.constraints ?? {});
  const wantedMin = (constraints as any).time_min ?? input.constraints?.time_min ?? 15;

  const injuryFlags = (constraints as any).injury_flags ?? input.constraints?.injury_flags;

  const topTagNames = ((plan.profile_tags ?? []) as any[]).slice(0, 12).map(String);

  const byId = new Map(WORKOUT_SUBTYPES.map((s) => [s.id, s]));

  const picked = (plan.top_subtypes ?? [])
    .map((p) => {
      const subtype = byId.get(p.subtype_id);
      if (!subtype) return null;
      return { p, subtype };
    })
    .filter(Boolean) as Array<{ p: RecoPlanBase["top_subtypes"][number]; subtype: WorkoutSubtype }>;

  if (!picked.length) return recommendWorkouts(input);

  const level: ExperienceLevel =
    input.context?.experience_level === "advanced"
      ? "advanced"
      : input.context?.experience_level === "intermediate"
      ? "intermediate"
      : "beginner";

  const top_picks: RecommendationPick[] = picked.slice(0, 3).map(({ p, subtype }, idx) => {
    const routine = pickRoutine({
      subtype,
      wantedMin,
      level,
      topTags: topTagNames,
      injuryFlags,
    });

    const reasons = buildReasons((p.reasons ?? []).slice(0, 3).map((_, i) => ({ tag: `llm_${i + 1}`, score: 1 })));

    const copy = {
      title: `${subtype.name} 추천`,
      summary: `${wantedMin}분 기준으로 구성했어요.`,
      reason_lines: (p.reasons ?? []).slice(0, 4),
    };

    const warnings: { tag: string; text: string }[] = [];

    for (const tag of p.contra_tags ?? []) {
      warnings.push({
        tag,
        text: `${tag} 주의가 필요해요. 통증/불편 시 강도 낮추거나 대체 동작으로 바꾸세요.`,
      });
    }

    if (injuryFlags) {
      for (const [k, on] of Object.entries(injuryFlags)) {
        if (on && !warnings.some((w) => w.tag === k)) {
          warnings.push({
            tag: k,
            text: `${k} 민감도가 설정되어 있어요. 해당 부위에 부담되는 동작은 줄여서 진행하세요.`,
          });
        }
      }
    }

    const score = Number((100 - idx * 5 + clamp(p.confidence ?? 0.6, 0, 1) * 10).toFixed(3));
    const confidence = clamp(p.confidence ?? 0.6, 0.55, 0.95);

    return {
      subtype_id: subtype.id,
      subtype_name: subtype.name,
      score,
      confidence,
      reasons,
      warnings,
      routine,
      copy,
    };
  });

  const alternatives = picked.slice(3, 10).map(({ p, subtype }) => {
    const routine = pickRoutine({
      subtype,
      wantedMin,
      level,
      topTags: topTagNames,
      injuryFlags,
    });

    return {
      subtype_id: subtype.id,
      subtype_name: subtype.name,
      score: Number((60 + clamp(p.confidence ?? 0.3, 0, 1) * 10).toFixed(3)),
      why_short: (p.reasons?.[0] ?? "대안 추천"),
      routine,
    };
  });

  return {
    top_picks,
    alternatives,
    meta: {
      computed_tags_top: [
        ...(goals ?? []).slice(0, 5).map((g, i) => ({ tag: `goal:${g}`, score: 10 - i })),
        ...(topTagNames ?? []).slice(0, 7).map((t, i) => ({ tag: `profile:${t}`, score: 8 - i })),
      ].slice(0, 5),
      explain: "LLM이 subtype 후보를 결정했고, 엔진(reco.data.ts + reco.engine.ts)이 step_pool 기반으로 루틴을 동적으로 조합했습니다.",
    },
  };
}
