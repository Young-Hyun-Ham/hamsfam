// lib/dto/types.ts (예시)

export type Role = "guest" | "user" | "admin" | string;

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

export interface UserSearchParams {
  keyword?: string;
}

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
