import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { toDateTimeString } from "@/lib/utils/utils";
import { FieldValue } from "firebase-admin/firestore";

/** 토큰 관리용 사용자 타입 */
type AdminTokenUser = {
  id: string;
  sub: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string | null;
  roles: string[];
  provider: string | null;
  createdAt: string;
  lastLoginAt?: string | null;

  // 토큰 관리용 필드
  totalToken: number;
  usedToken: number;
  remainToken: number;
};

type ChargeUserTokenInput = {
  /** users 컬렉션 document id (우리가 AdminTokenUser.id로 쓰는 값) */
  userId: string;
  /** 충전할 토큰 양 (양수) */
  amount: number;
  /** 메모 (선택) */
  memo?: string;
};


const USERS_COLLECTION = "users";
const TOKEN_COLLECTION = "user_token";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = (searchParams.get("keyword") ?? "").trim().toLowerCase();

    // 1) users 컬렉션
    const userSnap = await adminDb
      .collection(USERS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    // 2) user_token 전체 조회해서 Map으로
    const tokenSnap = await adminDb.collection(TOKEN_COLLECTION).get();

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
        remainToken:
          data.remainToken ??
          (data.totalToken ?? 0) - (data.usedToken ?? 0),
      });
    });

    // 3) join하여 AdminTokenUser로 변환
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

        totalToken: token.totalToken ?? 0,
        usedToken: token.usedToken ?? 0,
        remainToken: token.remainToken ?? 0,
      };
    });

    // 4) 검색 필터
    if (keyword) {
      items = items.filter((u) => {
        const name = (u.name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        const sub = (u.sub ?? "").toLowerCase();
        return (
          name.includes(keyword) ||
          email.includes(keyword) ||
          sub.includes(keyword)
        );
      });
    }

    return NextResponse.json({ items });
  } catch (e) {
    console.error("admin firebase user-tokens list error:", e);
    return NextResponse.json(
      { error: "사용자/토큰 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChargeUserTokenInput;
    const { userId, amount, memo } = body;

    if (!userId || typeof amount !== "number") {
      return NextResponse.json(
        { error: "userId와 amount는 필수입니다." },
        { status: 400 },
      );
    }

    const tokenDocRef = adminDb.collection(TOKEN_COLLECTION).doc(userId);
    const snap = await tokenDocRef.get();

    const now = FieldValue.serverTimestamp();

    let beforeTotal = 0;
    let beforeUsed = 0;

    if (!snap.exists) {
      // 기존 데이터 없음 → 신규 생성
      beforeTotal = 0;
      beforeUsed = 0;

      await tokenDocRef.set({
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

      await tokenDocRef.update({
        totalToken,
        usedToken,
        remainToken,
        updatedAt: now,
      });
    }

    // history 서브컬렉션
    const historyRef = tokenDocRef.collection("history").doc();
    await historyRef.set({
      amount,
      memo: memo ?? "",
      createdAt: now,
      beforeTotal,
      afterTotal: beforeTotal + amount,
      beforeRemain: beforeTotal - beforeUsed,
      afterRemain: beforeTotal - beforeUsed + amount,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin firebase user-tokens charge error:", e);
    return NextResponse.json(
      { error: "토큰 충전에 실패했습니다." },
      { status: 500 },
    );
  }
}
