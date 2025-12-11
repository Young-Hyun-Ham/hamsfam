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
  AdminTokenUser,
  ChargeUserTokenInput,
} from "../types";
import { toDateTimeString } from "@/lib/utils/firebaseUtils";

const colRef = collection(db, "users");
/* ========================= 목록 조회 ========================= */
export async function fetchUserList(
  params: any = {},
): Promise<AdminTokenUser[]> {
  const { keyword } = params;

  // 1) users 컬렉션(기존과 동일)
  const qRef = query(colRef, orderBy("createdAt", "desc"));
  const userSnap = await getDocs(qRef);

  // 2) user_token 컬렉션 전체를 먼저 읽어서 Map 으로 만들어 둔다. (id 기준)
  const tokenColRef = collection(db, "user_token");
  const tokenSnap = await getDocs(tokenColRef);

  const tokenMap = new Map<
    string,
    {
      totalToken?: number;
      usedToken?: number;
      remainToken?: number;
    }
  >();

  tokenSnap.forEach((d) => {
    const data = d.data() as any;
    tokenMap.set(d.id, {
      totalToken: data.totalToken ?? 0,
      usedToken: data.usedToken ?? 0,
      // remainToken 이 별도 필드로 없으면 total - used 로 계산
      remainToken:
        data.remainToken ??
        (data.totalToken ?? 0) - (data.usedToken ?? 0),
    });
  });

  // 3) users + user_token 조합해서 AdminTokenUser 로 매핑
  let items: AdminTokenUser[] = userSnap.docs.map((d) => {
    const data = d.data() as any;

    const token = tokenMap.get(d.id) ?? {
      totalToken: 0,
      usedToken: 0,
      remainToken: 0,
    };

    return {
      id: d.id,
      sub: data.sub ?? d.id,
      email: data.email ?? null,
      name: data.name ?? null,
      avatarUrl: data.avatar_url ?? null,
      roles: data.roles ?? ["guest"],
      provider: data.provider ?? null,
      createdAt: toDateTimeString(data.createdAt) ?? "",
      lastLoginAt: toDateTimeString(data.lastLoginAt),

      // ▼ 토큰 정보 (user_token 조인 결과)
      totalToken: token.totalToken ?? 0,
      usedToken: token.usedToken ?? 0,
      remainToken: token.remainToken ?? 0,
    };
  });

  // 4) 🔍 검색 필터
  if (keyword && keyword.trim()) {
    const k = keyword.toLowerCase();
    items = items.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(k) ||
        (u.email ?? "").toLowerCase().includes(k) ||
        (u.sub ?? "").toLowerCase().includes(k),
    );
  }

  return items;
}

// ========================= 토큰 충전 =========================
export async function chargeUserToken({
  userId,
  amount,
  memo,
}: ChargeUserTokenInput): Promise<void> {

  // user_token 문서 id를 users의 doc id와 동일하게 사용
  const tokenDocRef = doc(db, "user_token", userId);

  const snap = await getDoc(tokenDocRef);
  const now = serverTimestamp();

  let beforeTotal = 0;
  let beforeUsed = 0;
  if (!snap.exists()) {
    beforeTotal = 0;
    beforeUsed = 0;
    // 기존 데이터가 없다면 신규 생성
    await setDoc(tokenDocRef, {
      userId,
      totalToken: amount,
      usedToken: 0,
      remainToken: amount,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const data = snap.data() as any;
    beforeTotal = data.totalToken ?? 0;
    beforeUsed = data.usedToken ?? 0;
    const prevTotal = data.totalToken ?? 0;
    const prevUsed = data.usedToken ?? 0;

    const totalToken = prevTotal + amount;
    const usedToken = prevUsed;
    const remainToken = totalToken - usedToken;

    await updateDoc(tokenDocRef, {
      totalToken,
      usedToken,
      remainToken,
      updatedAt: now,
    });
  }

  // 충전 내역용 history 서브컬렉션
  const historyCol = collection(tokenDocRef, "history");
  const historyRef = doc(historyCol);
  await setDoc(historyRef, {
    amount,
    memo: memo ?? "",
    createdAt: now,
    beforeTotal,
    afterTotal: beforeTotal + amount,
    beforeRemain: beforeTotal - beforeUsed,
    afterRemain: beforeTotal - beforeUsed + amount,
  });
}

// ========================= 충전 History 조회 =========================
export async function fetchUserTokenHistory(userId: string) {
  const historyRef = collection(db, "user_token", userId, "history");
  const q = query(historyRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      amount: data.amount,
      memo: data.memo,
      createdAt: toDateTimeString(data.createdAt),
      beforeTotal: data.beforeTotal,
      afterTotal: data.afterTotal,
      beforeRemain: data.beforeRemain,
      afterRemain: data.afterRemain,
    };
  });
}

/* ========================= Export ========================= */
export default {
  fetchUserList,
  chargeUserToken,
  fetchUserTokenHistory,
};
