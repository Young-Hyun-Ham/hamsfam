// src/lib/onboarding/reco.data.ts
import type { NoiseLevel, SpaceLevel, StepPoolItem } from "./reco.types";

export const PROFILE_TAG_CATALOG: { tag: string; name: string; desc: string }[] = [
  { tag: "routine_friendly", name: "계획/루틴 선호", desc: "정해진 루틴이 있어야 편함" },
  { tag: "spontaneous", name: "즉흥/기분형", desc: "그날 컨디션에 따라 선택" },

  { tag: "guided_instruction", name: "가이드 선호", desc: "순서/설명을 따라가는 걸 선호" },
  { tag: "follow_along", name: "따라하기 선호", desc: "설명 최소, 바로 따라하는 스타일" },

  { tag: "progress_tracking", name: "기록/성장형", desc: "기록/수치/누적이 동기" },
  { tag: "fun_first", name: "재미 우선", desc: "재미가 동기" },

  { tag: "goal_oriented", name: "목표 지향", desc: "목표가 있으면 더 잘함" },
  { tag: "low_pressure", name: "부담 회피", desc: "압박감이 있으면 하기 싫어짐" },

  { tag: "time_crunched", name: "짧게 자주", desc: "10~15분 단위 선호" },
  { tag: "long_session_ok", name: "길게 몰아서", desc: "30분+ 세션도 괜찮음" },

  { tag: "restart_planner", name: "재시작 계획형", desc: "쉬면 다시 계획 세워 복귀" },
  { tag: "flow_flexible", name: "흐름 복귀형", desc: "무리 없이 천천히 복귀" },

  { tag: "high_intensity_preference", name: "고강도 선호", desc: "땀/힘듦이 운동 느낌" },
  { tag: "low_impact", name: "저부하 선호", desc: "개운/무리없음 선호" },

  { tag: "soreness_positive", name: "근육통 긍정", desc: "근육통이 오면 성취감" },
  { tag: "soreness_averse", name: "근육통 회피", desc: "근육통이 부담" },

  { tag: "form_focused", name: "자세/정확도", desc: "자세 설명 중요" },
  { tag: "tempo_motivated", name: "리듬/템포", desc: "리듬/박자 중요" },

  { tag: "coach_cues", name: "코칭 포인트", desc: "무릎/골반/호흡 포인트 선호" },
  { tag: "minimal_guidance", name: "설명 최소", desc: "말 적고 바로 따라하기" },

  { tag: "motivation_low", name: "귀찮음 장벽", desc: "시작 장벽 높음" },
  { tag: "boredom_sensitive", name: "지루함 장벽", desc: "재미 없으면 중단" },
  { tag: "intensity_sensitive", name: "강도 장벽", desc: "너무 힘들면 중단" },
  { tag: "needs_structure", name: "구조/가이드 필요", desc: "무엇을 해야 할지 명확해야 함" },

  { tag: "personalization_seeking", name: "개인맞춤 기대", desc: "맞춤 추천 원함" },
  { tag: "habit_building", name: "습관 만들기", desc: "꾸준함이 목표" },
  { tag: "quick_results", name: "짧고 확실", desc: "짧은 시간 성취 원함" },
  { tag: "stress_relief", name: "스트레스 해소", desc: "마음/스트레스 완화 원함" }
];

type WeightPatch = { add?: Record<string, number>; avoid?: Record<string, number>; add2?: any };

export const ANSWER_TO_TAG_WEIGHTS: Record<string, Record<string, WeightPatch>> = {
  q1: {
    plan: { add: { routine_friendly: 2, restart_planner: 1 } },
    mood: { add: { spontaneous: 2, flow_flexible: 1 } }
  },
  q2: {
    guided: { add: { guided_instruction: 2, needs_structure: 1 } },
    follow: { add: { follow_along: 2, minimal_guidance: 1 } }
  },
  q3: {
    progress: { add: { progress_tracking: 2, goal_oriented: 1 } },
    fun: { add: { fun_first: 2, boredom_sensitive: 1 } }
  },
  q4: {
    goal: { add: { goal_oriented: 2, progress_tracking: 1 } },
    pressure: { add: { low_pressure: 2, flow_flexible: 1 } }
  },
  q5: {
    short: { add: { time_crunched: 2, habit_building: 1 } },
    long: { add: { long_session_ok: 2 } }
  },
  q6: {
    restart: { add: { restart_planner: 2, routine_friendly: 1 } },
    flow: { add: { flow_flexible: 2, low_pressure: 1 } }
  },
  q7: {
    hard: { add: { high_intensity_preference: 2, progress_tracking: 1 }, avoid: { low_impact: 1 } },
    easy: { add: { low_impact: 2, stress_relief: 1 }, avoid: { high_intensity_preference: 1 } }
  },
  q8: {
    proud: { add: { soreness_positive: 2, high_intensity_preference: 1 } },
    burden: { add: { soreness_averse: 2, intensity_sensitive: 1 }, avoid: { high_intensity_preference: 1 } }
  },
  q9: {
    form: { add: { form_focused: 2, coach_cues: 1 } },
    tempo: { add: { tempo_motivated: 2, fun_first: 1 } }
  },
  q10: {
    coach: { add: { coach_cues: 2, guided_instruction: 1 } },
    minimal: { add: { minimal_guidance: 2, follow_along: 1 } }
  },
  q11: {
    lazy: { add: { motivation_low: 2, time_crunched: 1 }, avoid: { long_session_ok: 1 } },
    boring: { add: { boredom_sensitive: 2, fun_first: 1 } },
    too_hard: { add: { intensity_sensitive: 2, low_impact: 1 }, avoid: { high_intensity_preference: 2 } },
    lost: { add: { needs_structure: 2, guided_instruction: 1 }, add2: { personalization_seeking: 1 } as any }
  },
  q12: {
    personal: { add: { personalization_seeking: 2, needs_structure: 1 } },
    habit: { add: { habit_building: 2, routine_friendly: 1 } },
    quick: { add: { quick_results: 2, time_crunched: 1 } },
    relief: { add: { stress_relief: 2, low_impact: 1 } }
  }
};

// q11 lost에서 add2 같은 꼼수 쓰기 싫으면 아래처럼 딱 한 번 정리
if ((ANSWER_TO_TAG_WEIGHTS.q11.lost as any).add2) {
  const extra = (ANSWER_TO_TAG_WEIGHTS.q11.lost as any).add2 as Record<string, number>;
  ANSWER_TO_TAG_WEIGHTS.q11.lost.add = { ...(ANSWER_TO_TAG_WEIGHTS.q11.lost.add ?? {}), ...extra };
  delete (ANSWER_TO_TAG_WEIGHTS.q11.lost as any).add2;
}

export const REASON_SENTENCE_MAP: Record<string, string> = {
  routine_friendly: "정해진 루틴을 반복할수록 꾸준함이 쉽게 만들어져요.",
  spontaneous: "컨디션에 맞춰 변형하기 쉬운 구성이 부담이 적어요.",
  guided_instruction: "순서/설명이 있는 프로그램이 시작 장벽을 낮춰줘요.",
  follow_along: "설명보다 따라하기 중심이라 생각 안 하고 몸을 움직이기 좋아요.",
  progress_tracking: "기록이 쌓일수록 동기가 유지돼요.",
  fun_first: "재미 요소가 있어야 지속이 쉬워요.",
  low_impact: "관절 부담이 적어 오래 가져가기 좋아요.",
  high_intensity_preference: "강한 자극이 동기로 작동해요.",
  needs_structure: "무엇을 해야 할지 명확할수록 실행 확률이 올라가요.",
  habit_building: "작게라도 반복하는 방식이 잘 맞아요.",
  stress_relief: "마음이 편해지는 루틴이 컨디션 관리에 좋아요.",
  coach_cues: "포인트 코칭이 있으면 자세 잡기가 쉬워요.",
  minimal_guidance: "말이 적고 템포가 빠를수록 몰입이 잘 돼요.",
  tempo_motivated: "리듬/템포가 있으면 지루함이 줄어요."
};

export const COPY_TEMPLATES = {
  title: "오늘의 추천: {{subtypeName}}",
  one_liner: "{{keyReason1}} + {{keyReason2}} 조합이라 지금 성향에 딱 맞아요.",
  routine_intro: "시간 {{time}}분 기준으로 이렇게 하면 좋아요:",
  warning_intro: "주의할 점:",
  alternatives_intro: "다른 대안도 있어요:"
};

export const SUBTYPES_STEPS = [
  {
    id: "light_warmup",
    name: "가벼운 워밍업",
    imgsrc: "/workouts/light_warmup.png",
  },
  {
    id: "easy_rhythm_routine",
    name: "리듬 루틴(쉬움)",
    imgsrc: "/workouts/easy_rhythm_routine.png",
  },
  {
    id: "cooldown",
    name: "쿨다운",
    imgsrc: "/workouts/cooldown.png",
  },
  {
    id: "breathing_bracing",
    name: "호흡+브레이싱",
    imgsrc: "/workouts/breathing_bracing.png",
  },
  {
    id: "dead_bug",
    name: "데드버그",
    imgsrc: "/workouts/dead_bug.png",
  },
  {
    id: "glute_bridge",
    name: "브릿지",
    imgsrc: "/workouts/glute_bridge.png",
  },
  {
    id: "clamshell_band",
    name: "클램쉘(밴드 옵션)",
    imgsrc: "/workouts/clamshell_band.png",
  },
  {
    id: "hip_mobility",
    name: "고관절 모빌리티",
    imgsrc: "/workouts/hip_mobility.png",
  },
  {
    id: "thoracic_rotation",
    name: "흉추 회전",
    imgsrc: "/workouts/thoracic_rotation.png",
  },
  {
    id: "breathing_reset",
    name: "호흡 정리",
    imgsrc: "/workouts/breathing_reset.png",
  },
  {
    id: "tabata_20_10",
    name: "타바타(20/10 x 8)",
    imgsrc: "/workouts/tabata_20_10.png",
  },
  {
    id: "short_interval_boost",
    name: "짧은 인터벌 보강",
    imgsrc: "/workouts/short_interval_boost.png",
  },
  {
    id: "warmup_walk_slow",
    name: "워밍업 걷기(느리게)",
    imgsrc: "/workouts/warmup_walk_slow.png",
  },
  {
    id: "fast_walking",
    name: "빠르게 걷기",
    imgsrc: "/workouts/fast_walking.png",
  },
  {
    id: "goblet_squat",
    name: "고블릿 스쿼트",
    imgsrc: "/workouts/goblet_squat.png",
  },
  {
    id: "dumbbell_row",
    name: "덤벨 로우",
    imgsrc: "/workouts/dumbbell_row.png",
  },
  {
    id: "shoulder_press",
    name: "숄더 프레스",
    imgsrc: "/workouts/shoulder_press.png",
  },
  {
    id: "squat",
    name: "스쿼트",
    imgsrc: "/workouts/squat.png",
  },
  {
    id: "knee_pushup",
    name: "푸시업(무릎)",
    imgsrc: "/workouts/knee_pushup.png",
  },
  {
    id: "short_lunge",
    name: "런지(짧게)",
    imgsrc: "/workouts/short_lunge.png",
  },
  {
    id: "lunge",
    name: "런지",
    imgsrc: "/workouts/lunge.png",
  },
  {
    id: "plank",
    name: "플랭크",
    imgsrc: "/workouts/plank.png",
  },
  
  // 스트레칭 목록
  {
    id: "final_stretching",
    name: "마무리 스트레칭",
    imgsrc: "/workouts/final_stretching.png",
  },
  {
    id: "hamstring_stretch",
    name: "햄스트링 스트레칭",
    imgsrc: "/workouts/hamstring_stretch.png",
  },
  {
    id: "hip_stretching",
    name: "엉덩이 굴곡 근육 스트레칭",
    imgsrc: "/workouts/hip_stretching.png",
  },
  {
    id: "hip_deepen_stretching",
    name: "엉덩이 굴곡 근육 심화 스트레칭",
    imgsrc: "/workouts/hip_deepen_stretching.png",
  },
  {
    id: "neck_stretch",
    name: "목 스트레칭",
    imgsrc: "/workouts/neck_stretch.png",
  },
  {
    id: "upper_trap_stretch",
    name: "승모근 스트레칭",
    imgsrc: "/workouts/upper_trap_stretch.png",
  },
  {
    id: "shoulder_cross_stretch",
    name: "어깨(가로) 스트레칭",
    imgsrc: "/workouts/shoulder_cross_stretch.png",
  },
  {
    id: "chest_opener_stretch",
    name: "가슴 열기 스트레칭",
    imgsrc: "/workouts/chest_opener_stretch.png",
  },
  {
    id: "lat_side_stretch",
    name: "광배근 옆구리 스트레칭",
    imgsrc: "/workouts/lat_side_stretch.png",
  },
  {
    id: "cat_cow_stretch",
    name: "캣카우(척추) 스트레칭",
    imgsrc: "/workouts/cat_cow_stretch.png",
  },
  {
    id: "child_pose_stretch",
    name: "차일드 포즈 스트레칭",
    imgsrc: "/workouts/child_pose_stretch.png",
  },
  {
    id: "spinal_twist_stretch",
    name: "누워서 척추 비틀기",
    imgsrc: "/workouts/spinal_twist_stretch.png",
  },
  {
    id: "quad_stretch",
    name: "허벅지 앞(대퇴사두) 스트레칭",
    imgsrc: "/workouts/quad_stretch.png",
  },
  {
    id: "calf_stretch",
    name: "종아리 스트레칭",
    imgsrc: "/workouts/calf_stretch.png",
  },
  {
    id: "adductor_stretch",
    name: "내전근(사타구니) 스트레칭",
    imgsrc: "/workouts/adductor_stretch.png",
  },
  {
    id: "pigeon_glute_stretch",
    name: "비둘기 자세(둔근) 스트레칭",
    imgsrc: "/workouts/pigeon_glute_stretch.png",
  },
  {
    id: "seated_hamstring_stretch",
    name: "앉아서 햄스트링 스트레칭",
    imgsrc: "/workouts/seated_hamstring_stretch.png",
  },
];

export type WorkoutSubtype = {
  id: string;
  name: string;

  // recommendation
  profile_tags: string[];
  contra_tags?: string[];
  goals: string[];

  intensity_range: [number, number];

  equipment: string[]; // ["none"], ["dumbbell_or_kettlebell"], ["gym"]
  space: SpaceLevel;
  noise_level: NoiseLevel;

  // quick routine templates
  session_templates?: Array<{
    id: string;
    duration_min: number;
    level: "beginner" | "intermediate" | "advanced";
    steps: { name: string; min: number }[];
  }>;
  step_pool?: StepPoolItem[];
};

export const WORKOUT_SUBTYPES: WorkoutSubtype[] = [
  {
    id: "strength_bodyweight_basic",
    name: "맨몸 근력(기초)",
    profile_tags: ["beginner_friendly", "home_friendly", "routine_friendly", "guided_instruction", "coach_cues"],
    contra_tags: ["wrist_sensitive", "knee_sensitive"],
    goals: ["근력", "체형", "자세", "기초체력"],
    intensity_range: [2, 4],
    equipment: ["none"],
    space: "small",
    noise_level: "low",
    session_templates: [
      {
        id: "bw_basic_10",
        duration_min: 10,
        level: "beginner",
        steps: [
          { name: "스쿼트", min: 2 },
          { name: "푸시업(무릎)", min: 2 },
          { name: "런지(짧게)", min: 2 },
          { name: "플랭크", min: 2 },
          { name: "스트레칭", min: 2 }
        ]
      },
      {
        id: "bw_basic_15",
        duration_min: 15,
        level: "beginner",
        steps: [
          { name: "스쿼트", min: 3 },
          { name: "푸시업(무릎)", min: 3 },
          { name: "런지", min: 3 },
          { name: "플랭크", min: 3 },
          { name: "마무리 스트레칭", min: 3 }
        ]
      }
    ],
    // 유동 스텝 풀
    step_pool: [],
  },
  {
    id: "strength_dumbbell",
    name: "덤벨/케틀벨 근력",
    profile_tags: ["efficient", "progress_tracking", "routine_friendly", "goal_oriented"],
    contra_tags: ["lower_back_sensitive"],
    goals: ["근력", "체형", "기초대사량"],
    intensity_range: [3, 5],
    equipment: ["dumbbell_or_kettlebell"],
    space: "small",
    noise_level: "low",
    session_templates: [
      {
        id: "db_15",
        duration_min: 15,
        level: "beginner",
        steps: [
          { name: "고블릿 스쿼트", min: 4 },
          { name: "덤벨 로우", min: 4 },
          { name: "숄더 프레스", min: 4 },
          { name: "스트레칭", min: 3 }
        ]
      }
    ],
    step_pool: [],
  },
  {
    id: "cardio_liss_walk",
    name: "LISS(걷기/가벼운 유산소)",
    profile_tags: ["low_impact", "stress_relief", "habit_building", "time_crunched"],
    contra_tags: [],
    goals: ["감량", "컨디션", "회복", "스트레스완화"],
    intensity_range: [1, 3],
    equipment: ["none_or_treadmill"],
    space: "any",
    noise_level: "silent",
    session_templates: [
      {
        id: "walk_20",
        duration_min: 20,
        level: "beginner",
        steps: [
          { name: "워밍업 걷기(느리게)", min: 3 },
          { name: "빠르게 걷기", min: 14 },
          { name: "쿨다운", min: 3 }
        ]
      }
    ],
    step_pool: [],
  },
  {
    id: "cardio_hiit",
    name: "HIIT(고강도 인터벌)",
    profile_tags: ["time_crunched", "high_intensity_preference", "quick_results", "fun_first"],
    contra_tags: ["knee_sensitive", "cardio_risk"],
    goals: ["감량", "심폐", "시간효율"],
    intensity_range: [4, 5],
    equipment: ["none_optional"],
    space: "small",
    noise_level: "high",
    session_templates: [
      {
        id: "hiit_10",
        duration_min: 10,
        level: "intermediate",
        steps: [
          { name: "가벼운 워밍업", min: 2 },
          { name: "타바타(20/10 x 8)", min: 4 },
          { name: "짧은 인터벌 보강", min: 2 },
          { name: "쿨다운", min: 2 }
        ]
      }
    ],
    step_pool: [],
  },
  {
    id: "mobility_stretching",
    name: "스트레칭(정적/동적)",
    profile_tags: ["recovery_focused", "stress_relief", "beginner_friendly", "low_impact"],
    contra_tags: [],
    goals: ["유연성", "회복", "통증완화", "자세"],
    intensity_range: [1, 2],
    equipment: ["none_optional"],
    space: "small",
    noise_level: "silent",
    session_templates: [
      {
        id: "stretch_10",
        duration_min: 10,
        level: "beginner",
        steps: [
          { name: "고관절 모빌리티", min: 3 },
          { name: "햄스트링 스트레칭", min: 3 },
          { name: "흉추 회전", min: 2 },
          { name: "호흡 정리", min: 2 }
        ]
      }
    ],
    step_pool: [],
  },
  {
    id: "mobility_pilates",
    name: "필라테스(매트/소도구)",
    profile_tags: ["posture_seeking", "controlled_movement", "low_impact", "guided_instruction", "coach_cues", "habit_building"],
    contra_tags: ["neck_sensitive_caution"],
    goals: ["코어", "자세", "근지구력"],
    intensity_range: [2, 4],
    equipment: ["mat_optional", "mini_band_optional"],
    space: "small",
    noise_level: "silent",
    session_templates: [
      {
        id: "pilates_15",
        duration_min: 15,
        level: "beginner",
        steps: [
          { name: "호흡+브레이싱", min: 2 },
          { name: "데드버그", min: 3 },
          { name: "브릿지", min: 3 },
          { name: "클램쉘(밴드 옵션)", min: 3 },
          { name: "마무리 스트레칭", min: 4 }
        ]
      }
    ],
    step_pool: [],
  },
  {
    id: "sport_dance",
    name: "댄스/에어로빅",
    profile_tags: ["fun_first", "tempo_motivated", "habit_building"],
    contra_tags: ["knee_sensitive_caution"],
    goals: ["감량", "심폐", "재미", "리듬"],
    intensity_range: [2, 5],
    equipment: ["none"],
    space: "medium",
    noise_level: "medium",
    session_templates: [
      {
        id: "dance_20",
        duration_min: 20,
        level: "beginner",
        steps: [
          { name: "가벼운 워밍업", min: 3 },
          { name: "리듬 루틴(쉬움)", min: 14 },
          { name: "쿨다운", min: 3 }
        ]
      }
    ],
    step_pool: [],
  },
];