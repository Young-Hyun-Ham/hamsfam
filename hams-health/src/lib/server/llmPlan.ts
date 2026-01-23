// src/lib/server/llmPlan.ts
/**
 * LLM Prompt Guide (Structured Outputs / strict: true)
 *
 * 역할:
 * - recoSchema.ts가 "형태(스키마)"를 강제한다.
 * - 이 파일은 "추천 판단 기준" + "스키마에 맞게 출력하기 위한 규칙"을 제공한다.
 *
 * 이미지 규칙:
 * - steps[].imgSrc 는 반드시 "/workouts/[stepId]" 형태 (확장자 없음)
 */

export const WORKOUT_IMAGE_BASE = "/workouts" as const;

export function stepImgSrc(stepId: string) {
  // 요구사항: "/workouts/[stepId]" (확장자 없음)
  return `${WORKOUT_IMAGE_BASE}/${stepId}.png`;
}

/**
 * strict: true 환경에서 안전한 출력 규칙
 * - object에서 properties에 있는 키는 보통 모두 출력되도록 유도(누락하면 스키마 에러/품질 저하)
 * - "없음"은 생략하지 말고 빈 배열/빈 문자열 등으로 채우도록 지시
 */
export function buildRecommendationGuide(params: {
  allowedStepIdsCsv: string;
  stepCatalogLines: string; // "- id: name" 형태
}) {
  const { allowedStepIdsCsv, stepCatalogLines } = params;

  return `
너는 홈트 추천 코치다.
반드시 "RecommendationOutput" JSON만 출력한다.
다른 텍스트/설명/마크다운/코드블록/주석 금지.

[중요: strict 출력 규칙]
- 스키마에 있는 필드는 생략하지 말고 반드시 출력하라.
- 값이 없으면 다음처럼 출력:
  - 배열: []
  - 문자열: ""
  - 숫자: 0 (단, 의미상 최소/최대는 준수)
- additionalProperties 금지. 정의된 키 외의 임의 키를 만들지 마라.

[연령/성별 반영 규칙]
✅ 나이/생년월일 정보:
- 입력에 derived.age / derived.age_band / derived.dob 가 있을 수 있다.
- derived.age/age_band가 있으면 그 값을 최우선으로 사용하라.
- derived가 없더라도 answers.q0 에 "YYYY-MM-DD" 형태의 dob가 있으면 참고하라.
- 나이/생년월일 정보는 강도(intensity), 충격성/관절부담 회피, 워밍업/쿨다운 비중에 반드시 반영하라.

✅ 나이 반영 규칙(반드시 지켜라):
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

[추천 생성 규칙]
1) generated_subtypes
- 1~3개 루틴(step) 생성 (없어도 되면 []로 출력)
- 각 subtype은 사용자의 constraints(시간/장비/공간/소음), injury_flags(부상/민감부위)와 충돌하지 않게 설계
- profile_tags / goals / intensity_range / equipment / space / noise_level을 논리적으로 채워라
- contra_tags는 위험/민감 포인트가 있으면 넣고, 없으면 []로 둬라
- session_templates / step_pool 는 없으면 [] 로 둬라 (생략 금지)

2) top_picks
- 1~3개
- top_picks[].subtype_id 는 반드시 generated_subtypes[].id 중 하나
- reasons/warnings는 없으면 []로 출력 (생략 금지)

3) steps 선택 규칙 (매우 중요)
- steps[].id 는 반드시 아래 목록 중 하나만 사용 (새 id 생성 금지):
  ${allowedStepIdsCsv}

- steps[].title 은 SUBTYPES_STEPS 카탈로그의 name(표시명)을 그대로 사용
- steps[].imgSrc 는 반드시 "/workouts/[stepId]" 형태로 작성 (확장자/쿼리스트링 금지)
  예) id가 "squat" 이면 imgSrc는 "/workouts/squat.png"

- steps[].phase 는 반드시 포함 (enum: warmup|main|finisher|cooldown)
- 일반적으로 warmup → main → finisher/cooldown 순서로 구성
- finisher/cooldown는 스트레칭 항목으로 무조건 3개 이상의 스트레칭 step을 선택해야 함.

4) 시간 정합성
- top_picks[].routine.duration_min 은 입력 constraints.time_min 이 있으면 그 값을 우선, 없으면 15
- routine.steps[].seconds 합계는 duration_min*60 과 ±1800초 이내로 맞춰라

5) 안전
- injury_flags가 true인 부위/관절 관련 위험 동작은 steps에서 피하고,
  unavoidable하면 warnings에 명확히 기재하고 대체/완화 포인트를 reasons에 포함

[SUBTYPES_STEPS 카탈로그]
${stepCatalogLines}
`.trim();
}

/**
 * openaiRecommend.ts에서 프롬프트를 만들 때 사용하는 헬퍼
 */
export function buildRecommendationPrompt(params: {
  guide: string;
  inputJson: string; // JSON.stringify(input, null, 2)
}) {
  const { guide, inputJson } = params;

  return `
${guide}

[입력]
${inputJson}
`.trim();
}
