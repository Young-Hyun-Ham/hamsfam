// src/lib/onboarding/questions.ts
import type { Question } from "./types";
import { SUBTYPES_STEPS } from "./reco.data"; 

function toOptions(ids: string[]) {
  return ids
    .map((id) => SUBTYPES_STEPS.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ label: (s as any).name, value: (s as any).id, thumbnail: `/workouts/${(s as any).id}.png` }));
}

// ✅ 시작(워밍업/모빌리티/초반 스트레칭) 후보
export const PROGRAM_START_STEP_IDS = [
  "breathing_bracing",
  "hip_mobility",
  "thoracic_rotation",
  "cat_cow_stretch",
  "child_pose_stretch",
  "lat_side_stretch",
  "hamstring_stretch",
  "adductor_stretch",
];

// ✅ 본운동(스트레칭이 아닌) 후보
export const PROGRAM_MAIN_STEP_IDS = [
  "fast_walking",
  "goblet_squat",
  "dumbbell_row",
  "shoulder_press",
  "squat",
  "knee_pushup",
  "short_lunge",
  "lunge",
  "plank",
  "tabata_20_10",
  "short_interval_boost",
];

// ✅ 마무리(쿨다운/정리 스트레칭) 후보
export const PROGRAM_FINISH_STEP_IDS = [
  "cooldown",
  "breathing_reset",
  "final_stretching",
  "neck_stretch",
  "upper_trap_stretch",
  "shoulder_cross_stretch",
  "chest_opener_stretch",
  "spinal_twist_stretch",
  "quad_stretch",
  "calf_stretch",
  "pigeon_glute_stretch",
  "seated_hamstring_stretch",
];

export const QUESTIONS: Question[] = [
  {
    id: "q0",
    dimension: "profile",
    kind: "dob",
    title: "생년월일을 알려줘",
    desc: "나이에 따라 추천 강도와 회복 시간을 더 정확히 맞출 수 있어",
    // minYear: 1940,
    // maxYear: 2026,
  },
  {
    id: "q0_gender",
    dimension: "profile",
    title: "성별을 알려줘",
    desc: "운동 강도/회복/루틴 균형을 더 정확히 맞추는 데 참고할게",
    options: [
      { label: "남성", value: "male" },
      { label: "여성", value: "female" },
      { label: "논바이너리/기타", value: "nonbinary" },
      { label: "말하고 싶지 않음", value: "prefer_not" },
    ],
  },
  {
    id: "q0_reco_mode",
    dimension: "profile",
    title: "추천 방식은 어떤 걸로 할까?",
    desc: "LLM은 더 유연한 맞춤 추천, 엔진은 빠르고 안정적인 추천이야",
    options: [
      { label: "LLM 맞춤 추천(추천)", value: "llm" },
      { label: "엔진 추천(빠름/안정)", value: "engine" },
      { label: "프로그램 직접 선택", value: "program" },
    ],
  },
  {
    id: "q_program_time",
    dimension: "program",
    title: "총 운동 시간을 선택해줘",
    desc: "선택한 시간 안에서 스텝 시간을 자동으로 배분할게",
    options: [
      { label: "10분", value: "10" },
      { label: "15분", value: "15" },
      { label: "20분", value: "20" },
      { label: "30분", value: "30" },
      { label: "60분", value: "60" },
    ],
  },

  // ✅ 프로그램용: 시작 스트레칭(다중 선택)
  {
    id: "q_program_start_stretch",
    dimension: "program",
    kind: "multi",
    title: "운동 시작 스트레칭을 선택해줘(복수 선택 가능)",
    desc: "워밍업/모빌리티 위주로 추천해",
    options: toOptions(PROGRAM_START_STEP_IDS), 
  },

  // ✅ 프로그램용: 메인 스텝(다중 선택)
  {
    id: "q_program_main_steps",
    dimension: "program",
    kind: "multi",
    title: "메인 운동을 선택해줘(복수 선택 가능)",
    desc: "근력/유산소/코어 중 원하는 걸 골라줘",
    options: toOptions(PROGRAM_MAIN_STEP_IDS),
  },

  // ✅ 프로그램용: 마무리 스트레칭(다중 선택)
  {
    id: "q_program_finish_stretch",
    dimension: "program",
    kind: "multi",
    title: "운동 마무리 스트레칭을 선택해줘(복수 선택 가능)",
    desc: "쿨다운/정적 스트레칭 위주로 추천해",
    options: toOptions(PROGRAM_FINISH_STEP_IDS),
  },
  {
    id: "q1",
    dimension: "personality",
    title: "운동을 시작할 때 나는?",
    desc: "가장 가까운 쪽을 골라줘",
    options: [
      { label: "계획표가 있어야 마음이 편하다", value: "plan" },
      { label: "그날 기분 따라 정한다", value: "mood" },
    ],
  },
  {
    id: "q2",
    dimension: "personality",
    title: "홈트 가이드가 있다면?",
    options: [
      { label: "순서대로 설명해주는 게 좋다", value: "guided" },
      { label: "따라 하다 보면 되는 게 좋다", value: "follow" },
    ],
  },
  {
    id: "q3",
    dimension: "motivation",
    title: "운동을 계속하게 만드는 건?",
    options: [
      { label: "기록이 쌓이는 것", value: "progress" },
      { label: "재미있고 지루하지 않은 것", value: "fun" },
    ],
  },
  {
    id: "q4",
    dimension: "motivation",
    title: "목표가 있으면 더 잘하나?",
    options: [
      { label: "명확한 목표가 필요하다", value: "goal" },
      { label: "부담되면 오히려 하기 싫다", value: "pressure" },
    ],
  },
  {
    id: "q5",
    dimension: "consistency",
    title: "가장 잘 맞는 운동 시간은?",
    options: [
      { label: "10~15분 짧고 자주", value: "short" },
      { label: "30분~1시간 보통", value: "normal" },
      { label: "1시간 몰아서", value: "long" },
    ],
  },
  {
    id: "q6",
    dimension: "consistency",
    title: "며칠 쉬면 나는?",
    options: [
      { label: "다시 계획 세워서 재시작", value: "restart" },
      { label: "흐름 따라 천천히 복귀", value: "flow" },
    ],
  },
  {
    id: "q7",
    dimension: "intensity",
    title: "운동 후 느낌은?",
    options: [
      { label: "땀나고 힘들어야 운동한 느낌", value: "hard" },
      { label: "개운하고 무리 없는 게 좋다", value: "easy" },
    ],
  },
  {
    id: "q8",
    dimension: "intensity",
    title: "근육통이 오면?",
    options: [
      { label: "뿌듯하다", value: "proud" },
      { label: "다음 운동이 부담된다", value: "burden" },
    ],
  },
  {
    id: "q9",
    dimension: "stimulus",
    title: "운동할 때 가장 중요한 건?",
    options: [
      { label: "정확한 자세 설명", value: "form" },
      { label: "리듬감 / 템포", value: "tempo" },
    ],
  },
  {
    id: "q10",
    dimension: "stimulus",
    title: "화면에 있다면 좋은 건?",
    options: [
      { label: "포인트(무릎/골반/호흡) 안내", value: "coach" },
      { label: "설명 최소, 바로 따라하기", value: "minimal" },
    ],
  },
  {
    id: "q11",
    dimension: "meta",
    title: "홈트 실패 이유가 있다면?",
    options: [
      { label: "귀찮아서", value: "lazy" },
      { label: "재미없어서", value: "boring" },
      { label: "너무 힘들어서", value: "too_hard" },
      { label: "뭘 해야 할지 몰라서", value: "lost" },
    ],
  },
  {
    id: "q12",
    dimension: "meta",
    title: "이 서비스에서 가장 기대하는 건?",
    options: [
      { label: "나한테 맞는 운동 추천", value: "personal" },
      { label: "운동 습관 만들기", value: "habit" },
      { label: "짧고 확실한 운동", value: "quick" },
      { label: "스트레스 해소", value: "relief" },
    ],
  },
  // 목표(가장 중요)
  {
    id: "q13_goal",
    dimension: "profile",
    title: "지금 가장 원하는 변화는?",
    desc: "추천 루틴의 중심(근력/유산소/모빌리티)을 결정해",
    options: [
      { label: "근력/탄탄한 몸", value: "strength" },
      { label: "감량/유산소 중심", value: "fatloss" },
      { label: "자세/정렬 개선", value: "posture" },
      { label: "유연성/뻣뻣함 개선", value: "mobility" },
      { label: "체력/지구력", value: "stamina" },
    ],
  },

  // 경험
  {
    id: "q14_exp",
    dimension: "profile",
    title: "운동 경험은 어느 정도야?",
    options: [
      { label: "초보(거의 안 해봄)", value: "beginner" },
      { label: "중간(가끔/간헐적으로)", value: "intermediate" },
      { label: "상급(꾸준히/루틴 있음)", value: "advanced" },
    ],
  },

  // 주당 빈도
  {
    id: "q15_weekly",
    dimension: "profile",
    title: "일주일에 몇 번이 현실적이야?",
    options: [
      { label: "주 2회", value: "two" },
      { label: "주 3회", value: "three" },
      { label: "주 5회", value: "five" },
    ],
  },

  // 집에서 하는 걸 원하나?
  {
    id: "q17_home",
    dimension: "profile",
    title: "주로 집에서 할 계획이야?",
    options: [
      { label: "네, 집에서 바로 할 수 있는 게 좋아", value: "yes" },
      { label: "아니, 장소는 크게 상관 없어", value: "no" },
    ],
  },
];
