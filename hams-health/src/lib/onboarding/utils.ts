// src/lib/onboarding/utils.ts
import type { AgeBand, Gender, RecommendInput } from "./reco.types";

export function parseDob(dob: string) {
  // "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dob ?? "").trim());
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (y < 1900 || y > 2100) return null;
  if (mo < 1 || mo > 12) return null;

  // 날짜 유효성(UTC 기준)
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }

  return { y, mo, d };
}

export function calcAgeUTC(dob: { y: number; mo: number; d: number }, now = new Date()) {
  const ny = now.getUTCFullYear();
  const nm = now.getUTCMonth() + 1;
  const nd = now.getUTCDate();

  let age = ny - dob.y;
  // 생일 아직 안 지났으면 -1
  if (nm < dob.mo || (nm === dob.mo && nd < dob.d)) age -= 1;

  if (!Number.isFinite(age)) return null;
  if (age < 0 || age > 120) return null;
  return age;
}

function toAgeBand(age: number): AgeBand {
  if (age < 20) return "10s";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  return "60_plus";
}

export function attachDerived(input: RecommendInput): RecommendInput {
  // ✅ dob 질문 id = q0
  const dobStr = input?.answers?.q0?.trim();
  const genderStr = (input?.answers?.q0_gender ?? "").trim();

  const derivedBase = {
    ...(input.derived ?? {}),
    ...(genderStr ? { gender: genderStr as Gender } : {}),
  };
  
  if (!dobStr) return input;

  const dob = parseDob(dobStr);
  if (!dob) return input;

  const age = calcAgeUTC(dob);
  if (age == null) {
    return {
      ...input,
      derived: { ...(input.derived ?? {}), dob: dobStr },
    };
  }

  return {
    ...input,
    derived: {
      ...derivedBase,
      dob: dobStr,
      age,
      age_band: toAgeBand(age),
    },
  };
}