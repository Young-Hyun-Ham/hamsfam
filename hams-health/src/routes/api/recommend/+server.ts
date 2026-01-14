// src/routes/api/recommend/+server.ts

import { json } from "@sveltejs/kit";
import type { RecommendInput } from "$lib/onboarding/reco.types";
import type { RecoPlanBase } from "$lib/onboarding/reco.types";
import { recommendFromPlan, recommendWorkouts } from "$lib/onboarding/reco.engine";
import { llmMakePlan } from "$lib/server/llmPlan"; // 아래 파일

export async function POST({ request }) {
  const body = await request.json();

  const input: RecommendInput = {
    answers: body.answers ?? {},
    goals: body.goals ?? ["체형", "감량"],
    constraints: body.constraints ?? { time_min: 15, equipment: ["none"], space: "small", noise_level: "low" },
    context: body.context ?? { experience_level: "beginner", weekly_days: 3 },
  };

  try {
    const plan: RecoPlanBase = await llmMakePlan(input);
    const output = recommendFromPlan(input, plan);
    return json(output);
  } catch (e) {
    // ✅ LLM 실패 시 기존 엔진으로 폴백
    return json(recommendWorkouts(input));
  }
}
