// src/lib/onboarding/reco.types.ts

/** =========================
 *  Common Enums / Tags
 *  ========================= */

export type NoiseLevel = "silent" | "low" | "medium" | "high";
export type SpaceLevel = "small" | "medium" | "large" | "outdoor_or_gym" | "gym" | "any";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type InjuryTag =
  | "knee_sensitive"
  | "wrist_sensitive"
  | "lower_back_sensitive"
  | "shoulder_sensitive"
  | "neck_sensitive";

export type InjuryFlags = Partial<Record<InjuryTag, boolean>>;

export type StepPhase = "warmup" | "main" | "finisher" | "cooldown";

/** 프로필/성향 태그는 LLM/엔진에서 공통으로 쓰므로 상수화 권장 */
export type ProfileTag =
  | "time_crunched"
  | "follow_along"
  | "low_pressure"
  | "beginner_friendly"
  | "home_friendly"
  | "routine_friendly"
  | "stress_relief"
  | "low_impact"
  | "habit_building";

export type Reason = { tag: string; why: string };

/** =========================
 *  Onboarding Input Types
 *  ========================= */

export type RecommendConstraints = {
  time_min?: number;        // 사용자가 확보 가능한 최소 시간(분)
  equipment?: string[];     // ["none"], ["dumbbell"], ["gym"] 등
  space?: SpaceLevel;
  noise_level?: NoiseLevel;
  injury_flags?: InjuryFlags;
};

export type RecommendContext = {
  experience_level?: ExperienceLevel;
  weekly_days?: number;
};

export type AgeBand = "10s" | "20s" | "30s" | "40s" | "50s" | "60_plus";
export type Gender = "male" | "female" | "nonbinary" | "prefer_not";

export type RecommendInput = {
  answers: Record<string, string>;
  goals?: string[];
  constraints?: RecommendConstraints;
  context?: RecommendContext;
  derived?: {
    dob?: string;      // "YYYY-MM-DD"
    age?: number;      // 만 나이
    age_band?: "10s"|"20s"|"30s"|"40s"|"50s"|"60_plus";
    gender?: Gender;
  };
};

/** =========================
 *  Engine Step Pool (조립용 원천 스텝)
 *  - reco.data.ts의 step_pool 구성과 맞물림
 *  ========================= */

export type StepPoolItem = {
  key: string;               // 내부 키(중복 방지/룰 적용용)  e.g. "goblet_squat"
  name: string;              // 화면 표시명                 e.g. "고블릿 스쿼트"
  phase: StepPhase;

  // 시간 범위 (분)
  min_range: [number, number];
  default_min: number;

  // 선호/성향 태그 매칭 가중치
  profile_tags?: ProfileTag[];
  goals?: string[];

  // 제약/부상 회피
  contra_tags?: InjuryTag[];

  // 선택 가중치
  weight?: number;
};

/** =========================
 *  Routine Steps (엔진/화면 공용)
 *  - Legacy(name/min)와 Resolved(id/seconds/title/imgSrc) 분리
 *  ========================= */

/** (Legacy) 과거 UI 표기용: 분 단위 */
export type RoutineStepLegacy = { name: string; min: number };

/** (권장) 엔진/플레이어 직결: 초 단위 + 메타 포함 */
export type RoutineStepResolved = {
  id: string;         // SUBTYPES_STEPS id (또는 step_pool id 체계)
  seconds: number;    // 초 단위
  phase?: StepPhase;

  // UI 메타 (서버에서 resolve)
  title: string;
  imgSrc: string;
};

export type Routine = {
  duration_min: number;
  level: ExperienceLevel;

  /**
   * ✅ 앞으로는 RoutineStepResolved를 표준으로 권장
   * - 과도기 호환이 필요하면 아래 유니온으로 잠시 유지 가능
   */
  steps: RoutineStepResolved[]; // ← 표준
  // steps: Array<RoutineStepResolved | RoutineStepLegacy>; // ← 과도기용(필요 시)
};

/** =========================
 *  (V2) LLM 생성 Subtype 메타
 *  - WORKOUT_SUBTYPES의 shape과 동일하게 유지
 *  ========================= */
export type GeneratedWorkoutSubtype = {
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

  // quick routine templates (선택)
  session_templates?: Array<{
    id: string;
    duration_min: number;
    level: ExperienceLevel;
    steps: { id: string; seconds: number; phase?: StepPhase; title: string; imgSrc: string }[];
  }>;

  // optional pool
  step_pool?: Array<{ id: string; title: string; imgSrc: string; phase?: StepPhase; seconds_hint?: number }>;
};

/** =========================
 *  Recommendation Output (최종 추천 결과)
 *  ========================= */

export type RecommendationPick = {
  subtype_id: string;
  subtype_name: string;

  score: number;
  confidence: number;

  reasons: Reason[];

  /** UI 표시용 경고 */
  warnings: Array<{ tag: string; text: string }>;

  /** ✅ 플레이어에서 바로 재생 가능하도록 Resolved steps 포함 */
  routine: Routine;

  copy: { title: string; summary: string; reason_lines: string[] };
};

export type RecommendationOutput = {
  /** LLM이 생성한 subtype 메타(화면/후속 추천에 사용) */
  generated_subtypes?: GeneratedWorkoutSubtype[];

  top_picks: RecommendationPick[];
  alternatives: Array<{
    subtype_id: string;
    subtype_name: string;
    score: number;
    why_short: string;
    
    routine: Routine;
  }>;
  meta: {
    computed_tags_top: Array<{ tag: string; score: number }>;
    explain: string;
  };
};

export type ProfileTagScores = Record<ProfileTag, number>;

/** =========================
 *  LLM Plan (Raw / Resolved)
 *  - LLM은 id+seconds(+phase)만
 *  - 서버에서 title/imgSrc 붙여 Resolved로 통일
 *  ========================= */

/** LLM이 반환하는 최소 스텝(메타 없음) */
export type RecoPlanStepRaw = {
  id: string;        // ✅ SUBTYPES_STEPS의 id 중 하나
  seconds: number;   // ✅ 초 단위
  phase?: StepPhase;
};

/** 서버에서 메타(title/imgSrc)를 붙인 최종 스텝 */
export type RecoPlanStepResolved = RecoPlanStepRaw & {
  title: string;
  imgSrc: string;
};

/** 공통 필드(steps 제외) */
export type RecoPlanBase = {
  top_subtypes: Array<{
    subtype_id: string;      // reco.data.ts의 subtype id
    intensity: number;       // 1~5
    confidence: number;      // 0~1
    reasons: string[];       // 사람이 읽을 이유
    contra_tags?: InjuryTag[];
  }>;

  constraints: {
    time_min: number;
    equipment: string[];
    space: Exclude<SpaceLevel, "outdoor_or_gym" | "gym" | "any"> | "small" | "medium" | "large"; // 안전하게
    noise_level?: NoiseLevel;
    injury_flags?: InjuryFlags;
  };

  goals: string[];
  profile_tags: ProfileTag[];
};

/** ✅ LLM 출력 전용 */
export type RecoPlanRaw = RecoPlanBase & {
  steps: RecoPlanStepRaw[];
};

/** ✅ 서버 응답(엔진/화면에서 그대로 사용) */
export type RecoPlanResolved = RecoPlanBase & {
  steps: RecoPlanStepResolved[];
};
