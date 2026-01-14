// src/lib/onboarding/store.ts
import { writable, get } from "svelte/store";
import type { AnswerMap } from "./types";
import { browser } from "$app/environment";

type OnboardingState = {
  step: number;          // 0-based
  answers: AnswerMap;
  startedAt: number;     // epoch ms
};

const KEY = "hams-health:onboarding:v1";

function load(): OnboardingState {
  const base: OnboardingState = { step: 0, answers: {}, startedAt: Date.now() };
  if (!browser) return base;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return base;
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

function persist(state: OnboardingState) {
  if (!browser) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export const onboarding = writable<OnboardingState>(load());

onboarding.subscribe((v) => persist(v));

export function setAnswer(qid: string, value: string) {
  onboarding.update((s) => ({
    ...s,
    answers: { ...s.answers, [qid]: value },
  }));
}

export function nextStep(max: number) {
  onboarding.update((s) => ({ ...s, step: Math.min(s.step + 1, max) }));
}

export function prevStep() {
  onboarding.update((s) => ({ ...s, step: Math.max(s.step - 1, 0) }));
}

export function resetOnboarding() {
  onboarding.set({ step: 0, answers: {}, startedAt: Date.now() });
  if (browser) localStorage.removeItem(KEY);
}

export function getDurationSec(): number {
  const s = get(onboarding);
  return Math.max(1, Math.round((Date.now() - s.startedAt) / 1000));
}
