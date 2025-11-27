import bcrypt from "bcryptjs";

// passlib 기본과 비슷하게 12라운드 권장
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);

// Python: pwd_context.hash(plain)과 동일
export async function hashPassword(plain: string) {
  console.log("ROUNDS:", ROUNDS);
  return bcrypt.hash(plain, ROUNDS);
}

// Python: pwd_context.verify(plain, hash)와 동일 (순서 주의!)
export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// passlib의 deprecated="auto" 비슷한 재해시 판단
export function needsRehash(hash: string) {
  // 예: $2b$12$... -> 라운드 추출
  const m = hash.match(/^\$2[aby]\$(\d{2})\$/);
  if (!m) return true; // bcrypt 형식이 아니면 재해시 유도
  const rounds = parseInt(m[1], 10);
  return rounds < ROUNDS;
}