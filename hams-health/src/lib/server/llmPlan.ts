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
  allowedreasonsLines: string
  allowedProfileTags: string
}) {
  const { allowedStepIdsCsv, stepCatalogLines, allowedreasonsLines, allowedProfileTags } = params;

  return `
너는 홈트 추천 코치다.
반드시 "RecommendationOutput" JSON만 출력한다.
다른 텍스트/설명/마크다운/코드블록/주석 금지.

(중요) meta.computed_tags_top 생성 규칙:
- computed_tags_top은 "사용자 성향/목표 TOP 키워드"를 5~8개로 만든다.
- 각 item은 { tag, desc, score } 이며 score는 1~10 정수, 내림차순 정렬.
- tag는 아래 두 종류만 허용:
  1) goal:<문자열>  (사용자 goals 또는 answers로 강하게 추론되는 목표)
  2) profile:<PROFILE_TAG> (아래 PROFILE_TAG_CATALOG에서만 선택)
- profile 태그의 desc는 반드시 카탈로그의 desc를 그대로 사용(의역/변형 금지).
  예: "profile:flow_flexible" 이면 desc는 "무리 없이 천천히 복귀" 여야 한다.
- 중복 tag 금지.

PROFILE_TAG_CATALOG (허용 profile 태그):
${allowedProfileTags}

(중요) alternatives 생성 규칙:
- alternatives는 "대안 추천" 목록이다. 정확히 4개 생성한다.
- 각 item은 { subtype_id, subtype_name, score, why_short, routine } 형태다.

[ID/이름 매핑 규칙]
- subtype_id는 반드시 PROFILE_TAG_CATALOG에 존재하는 tag 값만 사용한다. (카탈로그 밖 금지)
- subtype_name은 subtype_id에 매칭되는 PROFILE_TAG_CATALOG의 desc를 그대로 사용한다. (의역/변형 금지)

[점수/정렬 규칙]
- score는 -1.0 ~ 1.0 사이의 실수(float)로 작성한다.
  - 0에 가까울수록 무난/중립, +면 적합, -면 덜 적합(또는 주의)이다.
- alternatives는 score 내림차순으로 정렬한다.
- top_picks에 이미 사용된 subtype_id(=tag)가 있으면 alternatives에 중복으로 넣지 말아라.

[사유 문구 규칙]
- why_short는 25~40자 내외의 짧은 한국어 한 문장.
- 반드시 사용자의 goals/constraints/meta.computed_tags_top과 연결해 이유를 써라.
- 같은 문구 반복 금지(예: "무난하게 맞는 대안" 반복 금지)

[routine / steps 규칙: 매우 중요]
- steps는 반드시 아래 목록에서만 선택 해야 한다.
${allowedStepIdsCsv}
- 해당 steps의 목록을 STEP_CATALOG로 제공한다.
- routine.steps는 반드시 STEP_CATALOG에서만 선택한다. (id는 STEP_CATALOG에 존재해야 함)
- steps의 title은 해당 step id의 STEP_CATALOG.name과 정확히 동일해야 한다. (의역/오타 금지)
- steps의 imgSrc는 해당 step id의 STEP_CATALOG.imgsrc와 정확히 동일해야 한다.
- step을 새로 만들거나, STEP_CATALOG에 없는 id/title/imgSrc를 생성하면 안 된다.

[Subtype → steps 구성 규칙]
- 각 alternatives의 routine.steps는 해당 subtype의 session_templates 중 하나를 기반으로 구성한다.
- session_templates의 steps는 (name/min) 형태이므로:
  - name에 해당하는 STEP_CATALOG 항목을 찾아 id/title/imgSrc를 채운다.
  - seconds는 min * 60 으로 변환한다.
- 매핑이 불가능한 name(=STEP_CATALOG에 없는 name)이 나오면 그 step은 사용하지 말고,
  같은 subtype 내 다른 template 또는 다른 subtype을 선택한다.

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
- steps[].imgSrc 는 반드시 "/workouts/[stepId].png" 형태로 작성 (쿼리스트링 금지, 확장자는 .png)
  예) id가 "squat" 이면 imgSrc는 "/workouts/squat.png"

- steps[].phase 는 반드시 포함 (enum: warmup|main|finisher|cooldown)
- 일반적으로 warmup → main → finisher/cooldown 순서로 구성
- finisher/cooldown는 스트레칭 항목으로 무조건 2개 이상의 스트레칭 step을 선택해야 함.

4) 시간 정합성
- routine.steps[].seconds 합계는 duration_min*60 과 ±1800초 이내로 맞춰라
- top_picks[].routine.duration_min은 (top_picks[].routine.steps[].seconds 합계)/60 을 우선하고, 없으면 15

5) 안전
- injury_flags가 true인 부위/관절 관련 위험 동작은 steps에서 피하고,
  unavoidable하면 warnings에 명확히 기재하고 대체/완화 포인트를 reasons에 포함

6) 성향 적합성
- reasons 에는 사용자의 성향(preferences)과 goals에 부합하는 이유를 구체적으로 설명
- reasons[].tag 는 반드시 아래 목록 중 하나의 key값만 사용:
${allowedreasonsLines}
- reasons[].why 는 반드시 위 목록에서 tag에 해당하는 value만 사용:
${allowedreasonsLines}

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
