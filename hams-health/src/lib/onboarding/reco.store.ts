// src/lib/onboarding/reco.store.ts
import { writable } from "svelte/store";
import type { RecommendationOutput, RecommendInput } from "./reco.types";

export const recoState = writable<{
  loading: boolean;
  error: string | null;
  data: RecommendationOutput | null;
}>({
  loading: false,
  error: null,
  data: null,
});

export async function requestRecommendation(input: RecommendInput) {
  recoState.update((s) => ({ ...s, loading: true, error: null }));
  console.log("requestRecommendation request input ========> ", input);
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `HTTP ${res.status}`);
    }

    const data = (await res.json()) as RecommendationOutput;
    console.log("llm json data ========> ", data)
    recoState.set({ loading: false, error: null, data });
    return data;
  } catch (e: any) {
    recoState.set({
      loading: false,
      error: e?.message ?? "추천 요청 실패",
      data: null,
    });
    throw e;
  }
}

export function resetReco() {
  recoState.set({ loading: false, error: null, data: null });
}
