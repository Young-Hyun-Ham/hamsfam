// lib/utils/userToken.ts
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { db } from "../postgresql";

/**
 * user_token 문서 기본 구조
 */
export type UserTokenDoc = {
  userId: string;
  totalToken: number;   // 충전된 총 토큰
  usedToken: number;    // 지금까지 사용한 토큰
  remainToken: number;  // 남은 토큰
  createdAt?: any;
  updatedAt?: any;
};

export type UseTokenInput = {
  userId: string;            // Firebase uid 또는 내부 userId
  amount: number;            // 사용 토큰 수 (양수)
  usageType: string;         // "chat_completion" | "scenario_run" 등
  source?: string;           // "chatbot" | "builder" 등
  sessionId?: string | null; // 채팅/시나리오 세션 ID
  messageId?: string | null; // 메시지 ID
  memo?: string;             // 관리용 메모(옵션)
};


//=====================================================================================================
// firebase 용
/**
 * user_token/{userId} 문서를 없으면 생성, 있으면 가져옴
 */
async function ensureUserTokenDoc(
  db: Firestore,
  userId: string,
): Promise<{ ref: ReturnType<typeof doc>; data: UserTokenDoc }> {
  const ref = doc(db, "user_token", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const initDoc: UserTokenDoc = {
      userId,
      totalToken: 0,
      usedToken: 0,
      remainToken: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, initDoc);
    return {
      ref,
      data: { ...initDoc, totalToken: 0, usedToken: 0, remainToken: 0 },
    };
  }

  const d = snap.data() as any;
  const data: UserTokenDoc = {
    userId: d.userId,
    totalToken: d.totalToken ?? 0,
    usedToken: d.usedToken ?? 0,
    remainToken: d.remainToken ?? 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };

  return { ref, data };
}

/**
 * 공통 토큰 사용 처리 함수
 * - user_token/{userId} 의 usedToken / remainToken 업데이트
 * - user_token/{userId}/used 서브컬렉션에 **사용처 상세 로그** 1건 추가
 * - user_token/{userId}/history 서브컬렉션에 **마이너스 히스토리** 1건 추가
 */
export async function useUserTokenFirebase(
  db: Firestore,
  input: UseTokenInput,
): Promise<void> {
  const { userId, amount, usageType, source, sessionId, messageId, memo } =
    input;

  if (!userId) {
    throw new Error("userId가 필요합니다.");
  }
  if (!usageType) {
    throw new Error("usageType 이 필요합니다.");
  }
  if (amount <= 0) {
    throw new Error("amount(사용 토큰 수)는 0보다 커야 합니다.");
  }

  const userTokenRef = doc(db, "user_token", userId);
  const usedColRef = collection(userTokenRef, "used");
  const historyColRef = collection(userTokenRef, "history");

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userTokenRef);

    let current: UserTokenDoc;
    if (!snap.exists()) {
      // 문서가 없으면 0으로 초기화
      current = {
        userId,
        totalToken: 0,
        usedToken: 0,
        remainToken: 0,
      };
      tx.set(userTokenRef, {
        ...current,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const d = snap.data() as any;
      current = {
        userId: d.userId,
        totalToken: d.totalToken ?? 0,
        usedToken: d.usedToken ?? 0,
        remainToken: d.remainToken ?? 0,
      };
    }

    if (current.remainToken < amount) {
      throw new Error("남은 토큰이 부족합니다.");
    }

    const beforeTotal = current.totalToken;
    const beforeRemain = current.remainToken;
    const beforeUsed = current.usedToken;

    const afterUsed = beforeUsed + amount;
    const afterRemain = beforeRemain - amount;

    // 1) user_token 문서 업데이트
    tx.update(userTokenRef, {
      usedToken: afterUsed,
      remainToken: afterRemain,
      updatedAt: serverTimestamp(),
    });

    // 2) used 서브컬렉션: 실제 사용처 상세 기록
    const usedRef = doc(usedColRef); // auto-id
    tx.set(usedRef, {
      amount,
      usageType,
      source: source ?? "chatbot",
      sessionId: sessionId ?? null,
      messageId: messageId ?? null,
      description: memo ?? "",
      remainTokenAfter: afterRemain,
      createdAt: serverTimestamp(),
    });

    // 3) history 서브컬렉션: 마이너스 히스토리 기록
    const historyRef = doc(historyColRef);
    tx.set(historyRef, {
      type: "use",
      amount, // 항상 양수
      beforeTotal,
      afterTotal: beforeTotal, // 사용은 totalToken 자체는 그대로
      beforeRemain,
      afterRemain,
      memo: memo ?? `[${usageType}] 토큰 사용`,
      createdAt: serverTimestamp(),
    });
  });
}


//=====================================================================================================
/**
 * PostgreSQL 기준 토큰 사용 처리
 */
export async function useUserTokenPostgres(input: UseTokenInput): Promise<void> {
  const {
    userId,
    amount,
    usageType,
    source,
    sessionId,
    messageId,
    memo,
  } = input;

  if (!userId) {
    throw new Error("userId가 필요합니다.");
  }
  if (!usageType) {
    throw new Error("usageType 이 필요합니다.");
  }

  const parsedAmount = Number(amount);
  if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error("amount(사용 토큰 수)는 0보다 큰 숫자여야 합니다.");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 1) 현재 토큰 상태 조회 (행 잠금)
    const selectRes = await client.query(
      `
      SELECT id, total_token, used_token, remain_token
      FROM user_tokens
      WHERE user_id = $1
      FOR UPDATE
      `,
      [userId],
    );

    let tokenRow = selectRes.rows[0];

    // 없으면 0으로 초기화
    if (!tokenRow) {
      const insertRes = await client.query(
        `
        INSERT INTO user_tokens (
          user_id,
          total_token,
          used_token,
          remain_token,
          created_at,
          updated_at
        )
        VALUES ($1, 0, 0, 0, NOW(), NOW())
        RETURNING id, total_token, used_token, remain_token
        `,
        [userId],
      );
      tokenRow = insertRes.rows[0];
    }

    const beforeTotal: number = tokenRow.total_token ?? 0;
    const beforeUsed: number = tokenRow.used_token ?? 0;
    const beforeRemain: number = tokenRow.remain_token ?? 0;

    if (beforeRemain < parsedAmount) {
      throw new Error("남은 토큰이 부족합니다.");
    }

    const afterUsed = beforeUsed + parsedAmount;
    const afterRemain = beforeRemain - parsedAmount;

    // 2) user_tokens 업데이트
    await client.query(
      `
      UPDATE user_tokens
      SET used_token = $2,
          remain_token = $3,
          updated_at = NOW()
      WHERE id = $1
      `,
      [tokenRow.id, afterUsed, afterRemain],
    );

    // 3) user_token_used: 실제 사용처 로그
    await client.query(
      `
      INSERT INTO user_token_used (
        user_id,
        amount,
        usage_type,
        source,
        session_id,
        message_id,
        description,
        remain_token_after,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        userId,
        parsedAmount,
        usageType,
        source ?? "chatbot",
        sessionId ?? null,
        messageId ?? null,
        memo ?? "",
        afterRemain,
      ],
    );

    // 4) user_token_history: 마이너스 히스토리
    await client.query(
      `
      INSERT INTO user_token_history (
        user_id,
        type,
        amount,
        before_total,
        after_total,
        before_remain,
        after_remain,
        memo,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        userId,
        "use",
        parsedAmount,
        beforeTotal,
        beforeTotal, // 사용은 total_token 변화 없음
        beforeRemain,
        afterRemain,
        memo ?? `[${usageType}] 토큰 사용`,
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}