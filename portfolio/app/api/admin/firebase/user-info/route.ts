// app/api/admin/firebase/user-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { toDateTimeString } from "@/lib/utils/utils";
import bcrypt from "bcryptjs";
import { FieldValue } from "firebase-admin/firestore";

export type Role = "guest" | "user" | "admin" | string;
export interface UserUpsertPayload {
  id?: string;            // uuid
  sub?: string;           // 없으면 서버에서 gen_random_uuid()::text 로 생성
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  roles?: Role[];         // 없으면 ["guest"]
  provider?: string | null;
  lastLoginAt?: string;      // 마지막접속일시
  password?: string;        
}

export interface AdminUser {
  id: string;
  sub: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;      // ISO string
  lastLoginAt: string | null;      // 마지막접속일시
  roles: Role[];          // jsonb → string[]
  provider: string | null;
}

const COLLECTION = "users";

// bcrypt 라운드 수 (기본 12)
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);
// 임의 비밀번호 생성 (OAuth 최초 가입 등에서 사용)
function generateRandomPassword(length = 16) {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") ?? "";

    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    let items = snap.docs.map((d) => {
      const data = d.data() as any;

      return {
        id: d.id,
        sub: data.sub ?? d.id,
        email: data.email ?? null,
        name: data.name ?? null,
        avatarUrl: data.avatar_url ?? null,
        roles: data.roles ?? ["guest"], // 기본값
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

    return NextResponse.json({ items });
  } catch (e) {
    console.error("admin firebase users list error:", e);
    return NextResponse.json(
      { error: "사용자 목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as UserUpsertPayload;

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

    // Firestore 문서 ID = sub 기준 (없으면 id)
    const docId = sub ?? id ?? "";
    if (!docId) {
      return NextResponse.json(
        { error: "sub 또는 id가 필요합니다." },
        { status: 400 }
      );
    }

    const ref = adminDb.collection(COLLECTION).doc(docId);
    const snap = await ref.get();
    const isNew = !snap.exists;

    // 비밀번호 해시
    let passwordHash: string | undefined;

    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), ROUNDS);
    } else if (isNew) {
      const randomPassword = generateRandomPassword();
      passwordHash = await bcrypt.hash(randomPassword, ROUNDS);
    }

    const saveData: any = {
      sub: docId,
      email: email ?? null,
      name: name ?? null,
      avatar_url: avatarUrl ?? null,
      roles: roles ?? ["guest"],
      provider: provider ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isNew) {
      saveData.createdAt = FieldValue.serverTimestamp();
    }

    if (passwordHash) {
      saveData.password = passwordHash;
    }

    // lastLoginAt 은 여기선 직접 세팅하지 않고, 로그인 로직에서 관리해도 됨
    await ref.set(saveData, { merge: true });

    const result: AdminUser = {
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

    return NextResponse.json(result);
  } catch (e) {
    console.error("admin firebase users upsert error:", e);
    return NextResponse.json(
      { error: "사용자 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}