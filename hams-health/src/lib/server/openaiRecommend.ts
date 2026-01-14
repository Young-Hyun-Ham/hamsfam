// src/lib/server/openaiRecommend.ts
import OpenAI from "openai";
import type { RecommendInput, RecommendationOutput } from "$lib/onboarding/reco.types";
import { recommendationOutputJsonSchema } from "./recoSchema";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(input: RecommendInput) {
  return `
너는 홈트 추천 코치다.
사용자의 answers(설문 응답), goals, constraints, context를 바탕으로
아래 JSON Schema(RecommendationOutput)에 맞는 결과만 출력한다.

요구사항:
- top_picks는 1~3개. 각 pick의 routine.duration_min은 constraints.time_min(있으면) 또는 15분을 기준으로 맞춘다.
- injury_flags true에 해당하는 부상 태그는 warnings/회피에 반영.
- equipment/space/noise_level 제약 준수.
- routine.steps의 min 합계는 duration_min과 ±1분 오차 이내로 맞춘다.
- steps.name은 화면 표시 가능한 운동명(한국어)로 작성.

입력:
${JSON.stringify(input, null, 2)}
`.trim();
}

export async function llmRecommend(input: RecommendInput): Promise<RecommendationOutput> {
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

  const resp = await client.responses.create({
    model,
    // Responses API: 입력은 input, 구조화 출력은 text.format 사용 :contentReference[oaicite:2]{index=2}
    input: buildPrompt(input),
    text: {
      format: {
        type: "json_schema",
        name: recommendationOutputJsonSchema.name,
        strict: recommendationOutputJsonSchema.strict,
        schema: recommendationOutputJsonSchema.schema,
      },
    },
  });

  // SDK helper: output_text()가 있으면 그걸 쓰고, 없으면 output[0]에서 text 추출
  // (환경/SDK 버전에 따라 다를 수 있어서 방어적으로 처리)
  const anyResp: any = resp as any;
  const text =
    (typeof anyResp.output_text === "function" && anyResp.output_text()) ||
    anyResp.output_text ||
    anyResp.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
    "";

  if (!text) throw new Error("LLM returned empty output_text");

  return JSON.parse(text) as RecommendationOutput;
}
