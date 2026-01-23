// src/lib/onboarding/questions.ts
import type { Question } from "./types";

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
];
