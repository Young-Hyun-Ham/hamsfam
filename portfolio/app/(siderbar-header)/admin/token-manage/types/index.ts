// app/(siderbar-header)/admin/token-manage/types/index.ts

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

export type {
  AdminTokenUser,
  ChargeUserTokenInput, 
};