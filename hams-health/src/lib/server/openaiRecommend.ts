// src/lib/server/openaiRecommend.ts
import OpenAI from "openai";
import { OPENAI_API_KEY, OPENAI_MODEL } from "$env/static/private";
import type { RecommendInput, RecommendationOutput } from "$lib/onboarding/reco.types";
import { SUBTYPES_STEPS, REASON_SENTENCE_MAP, PROFILE_TAG_CATALOG, WORKOUT_SUBTYPES } from "$lib/onboarding/reco.data";
import { recommendationOutputJsonSchema } from "./recoSchema";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const ALLOWED_STEP_IDS = SUBTYPES_STEPS.map((s) => s.id).join(", ");
const STEP_LINES = SUBTYPES_STEPS.map((s) => `- ${s.id}: ${s.name}`).join("\n");
const REASONS_LINES = Object.entries(REASON_SENTENCE_MAP).map(([key, value]) => `- ${key}: ${value}`).join("\n");
const PROFILE_LINES = PROFILE_TAG_CATALOG
  .map((x) => `- ${x.tag}: ${x.desc}`)
  .join("\n");
  
import { buildRecommendationGuide, buildRecommendationPrompt } from "./llmPlan";

function buildPrompt(input: RecommendInput) {
  const guide = buildRecommendationGuide({
    allowedStepIdsCsv: ALLOWED_STEP_IDS,
    stepCatalogLines: STEP_LINES,
    allowedreasonsLines: REASONS_LINES,
    allowedProfileTags: PROFILE_LINES,
  });
  console.log("======================>", JSON.stringify(input, null, 2))

  return buildRecommendationPrompt({
    guide,
    inputJson: JSON.stringify(input, null, 2),
  });
}

export async function llmRecommend(input: RecommendInput): Promise<RecommendationOutput> {
  const model = OPENAI_MODEL || "gpt-4o-mini";

  const resp = await client.responses.create({
    model,
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

  const anyResp: any = resp as any;
  const text =
    (typeof anyResp.output_text === "function" && anyResp.output_text()) ||
    anyResp.output_text ||
    anyResp.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
    "";

  if (!text) throw new Error("LLM returned empty output_text");

  return JSON.parse(text) as RecommendationOutput;
}
