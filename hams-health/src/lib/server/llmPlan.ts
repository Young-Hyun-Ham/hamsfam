// src/lib/server/llmPlan.ts
import OpenAI from "openai";
import { OPENAI_API_KEY, OPENAI_MODEL } from "$env/static/private";
import type { RecommendInput, RecoPlanRaw, RecoPlanResolved } from "$lib/onboarding/reco.types";
import { WORKOUT_SUBTYPES, SUBTYPES_STEPS } from "$lib/onboarding/reco.data";
import { attachDerived } from "$lib/onboarding/utils";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });
const ALLOWED_STEP_IDS = new Set(SUBTYPES_STEPS.map((s) => s.id));

function buildPrompt(input: RecommendInput) {
  const allowedSubtypeIds = WORKOUT_SUBTYPES.map((s) => s.id).join(", ");
  const allowedStepIds = SUBTYPES_STEPS.map((s: any) => s.id).join(", ");
  const stepLines = SUBTYPES_STEPS
    .map((s: any) => `- ${s.id}: ${s.name}`)
    .join("\n");

  return `
너는 홈트 추천 플래너다.
반드시 "RecoPlanRaw" JSON만 출력한다. 다른 텍스트/설명/마크다운/코드블록 금지.

✅ 나이/생년월일 정보:
- 입력에 derived.age / derived.age_band / derived.dob 가 있을 수 있다.
- derived.age/age_band가 있으면 그 값을 최우선으로 사용하라.
- derived가 없더라도 answers.q0 에 "YYYY-MM-DD" 형태의 dob가 있으면 참고하라.
- 나이/생년월일 정보는 강도(intensity), 충격성/관절부담 회피, 워밍업/쿨다운 비중에 반드시 반영하라.

가능한 subtype_id 목록 (반드시 아래 중 하나):
${allowedSubtypeIds}

가능한 step id 목록 (steps[].id는 반드시 아래 중 하나, 새로운 id 생성 금지):
${allowedStepIds}

step id 상세 (id: 표시명)
${stepLines}

규칙:
- top_subtypes는 1~3개
- subtype_id는 목록 중 하나만
- intensity 1~5
- constraints.time_min은 입력 constraints.time_min 우선(없으면 15)
- equipment/space/noise_level/injury_flags는 입력 constraints를 최대한 유지
- profile_tags는 다음 중에서만 선택:
  ["time_crunched","follow_along","low_pressure","beginner_friendly","home_friendly","routine_friendly"]

- ✅ steps는 "초 단위"로 작성
- ✅ steps[].id는 반드시 허용 목록 중 하나
- ✅ steps에 title/imgSrc/imgsrc/name 같은 필드는 절대 포함하지 마라 (금지)
- ✅ 전체 steps[].seconds 합은 constraints.time_min(분)*60 근처(±20%)
- ✅ 일반적으로 warmup → main → finisher/cooldown 순서
- ✅ injury_flags가 true인 민감 동작은 회피

나이 반영 규칙(반드시 지켜라):
- age 정보가 없으면: 기본(초보/무리 없는 강도)로 계획
- age >= 50 (또는 age_band = "50s" | "60_plus"):
  - intensity는 보통 2~3 범위로(너무 높은 강도 금지)
  - 워밍업/쿨다운 비중을 늘려라(총 시간 내에서 조정)
  - 충격성/과부하 느낌 동작은 회피하고 안정적인 템포/전환을 반영
- age 35~49:
  - intensity 2~4 가능(성향이 hard면 4까지)
  - 무리한 충격성 인터벌은 신중히(짧게/대체)
- age 18~34:
  - 성향이 hard/tempo/goal 쪽이면 intensity 3~5 가능
- age < 18:
  - 안전 우선, intensity 1~3 범위, 과부하/충격 회피

✅ 성별 정보:
- 입력에 derived.gender 가 있을 수 있다. ("male" | "female" | "nonbinary" | "prefer_not")
- derived.gender가 없더라도 answers.q0_gender 가 있으면 참고하라.
- 성별 정보는 **편견/고정관념 없이** 안전과 회복, 근력/유산소 밸런스(특히 상체/하체 비중) 조정에만 제한적으로 반영하라.
- "prefer_not" 이거나 값이 없으면 성별 가정 금지.

RecoPlanRaw 형태(정확히 이 JSON 스키마로만 출력):
{
  "top_subtypes":[{"subtype_id":"...", "intensity":3, "confidence":0.7, "reasons":["..."], "contra_tags":["knee_sensitive"]}],
  "constraints":{"time_min":15,"equipment":["none"],"space":"small","noise_level":"low","injury_flags":{}},
  "goals":["근력","체형"],
  "profile_tags":["beginner_friendly","home_friendly"],
  "steps":[
    { "id":"warmup_walk_slow", "seconds":120, "phase":"warmup" },
    { "id":"squat", "seconds":180, "phase":"main" }
  ]
}

입력:
${JSON.stringify(input, null, 2)}
`.trim();
}


// helper 추가
function resolvePlan(raw: RecoPlanRaw, input: RecommendInput): RecoPlanResolved {
  // subtype whitelist
  const allowedSubtype = new Set(WORKOUT_SUBTYPES.map((s) => s.id));
  for (const p of raw.top_subtypes ?? []) {
    if (!allowedSubtype.has(p.subtype_id)) {
      throw new Error(`unknown subtype_id: ${p.subtype_id}`);
    }
  }

  // time_min 보정
  raw.constraints = raw.constraints ?? ({} as any);
  raw.constraints.time_min = Math.max(
    5,
    Math.min(120, raw.constraints.time_min ?? input.constraints?.time_min ?? 15)
  );

  raw.profile_tags = Array.isArray(raw.profile_tags) ? raw.profile_tags : [];
  raw.goals = Array.isArray(raw.goals) ? raw.goals : [];

  // ✅ SUBTYPES_STEPS 메타 맵 (실제 필드: name, imgsrc)
  const stepMetaMap = new Map(
    SUBTYPES_STEPS.map((s: any) => [
      s.id,
      {
        title: s.name, // ✅ name 고정
        imgSrc: s.imgsrc || `/workouts/${s.id}.png`, // ✅ imgsrc (소문자) 사용
      },
    ])
  );

  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    throw new Error("plan.steps invalid");
  }

  // ✅ 허용 필드만 남기는 sanitize + meta attach
  const steps = raw.steps.map((st: any) => {
    const id = st?.id;
    const seconds = st?.seconds;
    const phase = st?.phase;

    const meta = stepMetaMap.get(id);
    if (!meta) throw new Error(`unknown step id: ${id}`);
    if (typeof seconds !== "number" || seconds <= 0) {
      throw new Error(`invalid seconds for step: ${id}`);
    }

    return {
      id,
      seconds,
      phase,
      title: meta.title,
      imgSrc: meta.imgSrc,
    };
  });

  return {
    top_subtypes: raw.top_subtypes,
    constraints: raw.constraints,
    goals: raw.goals,
    profile_tags: raw.profile_tags,
    steps,
  };
}

export async function llmMakePlan(input: RecommendInput): Promise<RecoPlanResolved> {
  const inputWithDerived = attachDerived(input);

  const model = OPENAI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    console.log(" inputWithDerived =========>", (inputWithDerived))
    console.log(" system promt =========>", buildPrompt(inputWithDerived))
    const resp = await client.responses.create(
      { model, input: buildPrompt(inputWithDerived) },
      { signal: controller.signal } as any
    );
    const anyResp: any = resp as any;
    const text =
      (typeof anyResp.output_text === "function" && anyResp.output_text()) ||
      anyResp.output_text ||
      anyResp.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
      "";

    if (!text) throw new Error("LLM empty");

    const raw = JSON.parse(stripJsonCodeBlock(text)) as RecoPlanRaw;
    if (!raw?.top_subtypes?.length) throw new Error("plan invalid");

    const v1 = validatePlanSteps(raw, inputWithDerived.constraints?.time_min ?? 15);
    if (!v1.ok) {
      const fixedText = await llmFixPlan(text, v1.reason);
      const fixedPlan = JSON.parse(stripJsonCodeBlock(fixedText));
      const inputTimeMin = inputWithDerived.constraints?.time_min ?? 15;

      const v2 = validatePlanSteps(fixedPlan, inputTimeMin);
      if (!v2.ok) {
        // ✅ 총 시간만 문제면 서버에서 자동 보정 한번 더 시도
        if (String(v2.reason).startsWith("total seconds out of range")) {
          const auto = autoFixTotalSeconds(fixedPlan, inputTimeMin);
          const v3 = validatePlanSteps(auto, inputTimeMin);
          if (v3.ok) {
            return resolvePlan(auto as RecoPlanRaw, inputWithDerived);
          }
        }

        throw new Error(`[llm] plan.steps invalid after fix: ${v2.reason}`);
      }

    }

    return resolvePlan(raw, inputWithDerived);
  } catch (e: any) {
    console.error("[llm] error", e?.name, e?.message || e);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// steps 검증 로직
function validatePlanSteps(plan: any, inputTimeMin: number) {
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    return { ok: false, reason: "steps missing" as const };
  }

  // ✅ id whitelist
  for (const s of plan.steps) {
    if (!s?.id || typeof s.id !== "string") {
      return { ok: false, reason: "step.id missing" as const };
    }
    if (!ALLOWED_STEP_IDS.has(s.id)) {
      return { ok: false, reason: `unknown step.id: ${s.id}` as const };
    }

    // ✅ seconds
    if (typeof s.seconds !== "number" || !Number.isFinite(s.seconds) || s.seconds <= 0) {
      return { ok: false, reason: `invalid seconds for ${s.id}` as const };
    }

    // ✅ 금지 필드 방지
    if ("title" in s || "imgSrc" in s || "imgsrc" in s) {
      return { ok: false, reason: `forbidden field in step: ${s.id}` as const };
    }
  }

  // ✅ 총 시간 체크 (±20%)
  const sum = plan.steps.reduce((a: number, b: any) => a + (b.seconds ?? 0), 0);
  const target = (plan.constraints?.time_min ?? inputTimeMin ?? 15) * 60;
  const lo = target * 0.8;
  const hi = target * 1.2;

  if (sum < lo || sum > hi) {
    return { ok: false, reason: `total seconds out of range: ${sum} (target ${target})` as const };
  }

  return { ok: true as const };
}

// 재시도
async function llmFixPlan(originalText: string, err: string) {
  const model = OPENAI_MODEL || "gpt-4o-mini";
  const allowedStepIds = Array.from(ALLOWED_STEP_IDS).join(", ");
  const fixPrompt = `
너는 JSON 수리기다.
반드시 RecoPlan JSON만 출력한다. 다른 텍스트 금지.

오류: ${err}

규칙:
- steps[].id는 반드시 아래 허용 목록 중 하나
- steps[].seconds는 초 단위 number
- steps에 title/imgSrc 같은 필드는 절대 포함 금지
- steps[].seconds 합은 constraints.time_min(분)*60 근처(±20%)

허용 step id 목록:
${allowedStepIds}

원본 JSON:
${originalText}
`.trim();

  const resp = await client.responses.create({ model, input: fixPrompt });
  const anyResp: any = resp as any;
  return (
    (typeof anyResp.output_text === "function" && anyResp.output_text()) ||
    anyResp.output_text ||
    anyResp.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
    ""
  );
}

// JSON 파싱 전에 코드블록 제거 유틸
function stripJsonCodeBlock(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function autoFixTotalSeconds(plan: any, inputTimeMin: number) {
  const out = { ...plan };
  out.constraints = out.constraints ?? {};
  const target = (out.constraints.time_min ?? inputTimeMin ?? 15) * 60;

  if (!Array.isArray(out.steps) || out.steps.length === 0) return out;

  // 현재 합
  let sum = out.steps.reduce((a: number, b: any) => a + (b?.seconds ?? 0), 0);
  if (!Number.isFinite(sum) || sum <= 0) return out;

  const lo = target * 0.8;
  const hi = target * 1.2;

  // 이미 범위면 그대로
  if (sum >= lo && sum <= hi) return out;

  // 1) 너무 짧으면: main 단계 위주로 반복해서 채우기
  if (sum < lo) {
    const steps = [...out.steps];

    const mainPool = steps.filter((s: any) => s?.phase === "main");
    const pool = (mainPool.length ? mainPool : steps).map((s: any) => ({
      id: s.id,
      seconds: s.seconds,
      phase: s.phase,
    }));

    // 안전장치: 무한 증식 방지
    const MAX_STEPS = 30;

    let i = 0;
    while (sum < lo && steps.length < MAX_STEPS && pool.length) {
      const src = pool[i % pool.length];
      const add = { ...src };

      steps.push(add);
      sum += add.seconds;
      i++;
    }

    // 마지막 스텝 seconds로 미세조정(너무 초과하면 줄여서 hi 안으로)
    if (sum > hi) {
      const over = sum - hi;
      const last = steps[steps.length - 1];
      if (last && typeof last.seconds === "number") {
        last.seconds = Math.max(10, last.seconds - over); // 최소 10초
      }
    }

    out.steps = steps;
    return out;
  }

  // 2) 너무 길면: 비율로 seconds를 줄여서 맞추기(단, 10초 이하로는 안 떨어지게)
  if (sum > hi) {
    const ratio = target / sum; // < 1
    const steps = out.steps.map((s: any) => {
      const sec = typeof s.seconds === "number" ? s.seconds : 0;
      const next = Math.max(10, Math.round(sec * ratio));
      return { ...s, seconds: next };
    });

    // 라운딩 때문에 target에서 벗어날 수 있으니 마지막으로 보정
    let newSum = steps.reduce((a: number, b: any) => a + (b?.seconds ?? 0), 0);
    const diff = target - newSum;

    if (steps.length && Number.isFinite(diff) && diff !== 0) {
      steps[steps.length - 1].seconds = Math.max(
        10,
        steps[steps.length - 1].seconds + diff
      );
    }

    out.steps = steps;
    return out;
  }

  return out;
}
