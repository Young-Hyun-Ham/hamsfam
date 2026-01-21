// types/user.ts
export type roleTypes = "guest" | "admin" | "user";

export type User = {
  id: string;
  sub: string;
  email: string;
  username: string;
  roles?: roleTypes[];
  provider?: string;
  accessToken?: string;
  refreshToken?: string;
  avatar_url?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
  isTestUser?: boolean;
}
