// src/routes/api/recommend/+server.ts
import { json } from "@sveltejs/kit";
import type { RecommendInput } from "$lib/onboarding/reco.types";
import { recommendWorkouts } from "$lib/onboarding/reco.engine";
import { llmRecommend } from "$lib/server/openaiRecommend";
import { buildProgramOutput } from "$lib/onboarding/program.builder";

export async function POST({ request }) {
  const body = await request.json();

  const input: RecommendInput = {
    answers: body.answers ?? {},
    goals: body.goals ?? ["체형", "감량"],
    constraints: body.constraints ?? {
      time_min: 15,
      equipment: ["none"],
      space: "small",
      noise_level: "low",
    },
    context: body.context ?? { experience_level: "beginner", weekly_days: 3 },
  };

  try {
    const mode = (input.answers as any)?.q0_reco_mode ?? "llm";

    if (mode === "engine") {
      return json(recommendWorkouts(input));
    } else if (mode === "program") {
      return json(buildProgramOutput(input));
    }

    // LLM이 subtype 메타 + steps 선택까지 전부 생성
    const output = await llmRecommend(input);
    // console.log("llm 성공 ===================>", output)
    return json(output);
  } catch (e) {
    // LLM 실패 시 기존 엔진으로 폴백
    // console.log("llm 실패 ===================>", e)
    return json(recommendWorkouts(input));
  }
}
