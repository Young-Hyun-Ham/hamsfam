import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  getDoc,
} from "firebase/firestore";

import type {
  AdminUser,
  UserUpsertPayload,
  UserSearchParams,
} from "../types";
import { toDateTimeString } from "@/lib/utils/firebaseUtils";
import bcrypt from "bcryptjs";

const colRef = collection(db, "users");
// bcrypt 라운드 수 (기본 12)
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);

// 임의 비밀번호 생성 (OAuth 최초 가입 등에서 사용)
function generateRandomPassword(length = 16) {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
}

/* ========================= 목록 조회 ========================= */
export async function fetchUserList(
  params: UserSearchParams = {}
): Promise<AdminUser[]> {

  const { keyword } = params;

  const qRef = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(qRef);

  let items: AdminUser[] = snap.docs.map((d) => {
    const data = d.data() as any;

    return {
      id: d.id,
      sub: data.sub ?? d.id,
      email: data.email ?? null,
      name: data.name ?? null,
      avatarUrl: data.avatar_url ?? null,
      roles: data.roles ?? ["guest"],        // DDL 기본값 반영
      provider: data.provider ?? null,
      createdAt: toDateTimeString(data.createdAt) ?? "",
      lastLoginAt: toDateTimeString(data.lastLoginAt),
    };
  });

  // 🔍 검색 필터
  if (keyword && keyword.trim()) {
    const k = keyword.toLowerCase();
    items = items.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(k) ||
        (u.email ?? "").toLowerCase().includes(k) ||
        (u.sub ?? "").toLowerCase().includes(k)
    );
  }

  return items;
}

/* ========================= 등록/수정 ========================= */
export async function upsertUser(payload: UserUpsertPayload): Promise<AdminUser> {
  const {
    id,
    sub,
    email,
    name,
    avatarUrl,
    roles,
    provider,
    lastLoginAt,
    password,
  } = payload;

  // Firestore 문서 ID = sub 기준
  const docId = sub ?? id ?? "";
  const ref = doc(db, "users", docId);
  // 기존 문서 존재 여부 확인 (신규/수정 구분)
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  // 비밀번호 해시 준비
  let passwordHash: string | undefined;

  if (password && password.trim().length > 0) {
    // 관리자 화면에서 직접 비밀번호를 입력한 경우
    passwordHash = await bcrypt.hash(password.trim(), ROUNDS);
  } else if (isNew) {
    // OAuth 등으로 처음 생성하는데 password가 없는 경우 → 임의 비밀번호 생성
    const randomPassword = generateRandomPassword();
    passwordHash = await bcrypt.hash(randomPassword, ROUNDS);
  }

  const saveData: any = {
    sub: docId,
    email: email ?? null,
    name: name ?? null,
    avatar_url: avatarUrl ?? null,
    roles: roles ?? ["guest"],      // 기본값
    provider: provider ?? null,
    updatedAt: serverTimestamp(),   // 항상 갱신
  };

  // 신규일 때만 createdAt 설정 (기존 값 유지)
  if (isNew) {
    saveData.createdAt = serverTimestamp();
  }

  // 비밀번호 변경/생성 시에만 password 필드 업데이트
  if (passwordHash) {
    saveData.password = passwordHash;
  }

  await setDoc(ref, saveData, { merge: true });

  return {
    id: docId,
    sub: docId,
    email: email ?? null,
    name: name ?? null,
    avatarUrl: avatarUrl ?? null,
    roles: roles ?? ["guest"],
    provider: provider ?? null,
    createdAt: "",
    lastLoginAt: lastLoginAt ?? "",
  };
}

/* ========================= 삭제 ========================= */
export async function deleteUser(idOrSub: string): Promise<void> {
  const ref = doc(db, "users", idOrSub);
  await deleteDoc(ref);
}

/* ========================= Export ========================= */
export default {
  fetchUserList,
  upsertUser,
  deleteUser,
};
