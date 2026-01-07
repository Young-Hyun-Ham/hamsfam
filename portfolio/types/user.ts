// types/user.ts
export type User = {
  id: string;
  sub: string;
  email: string;
  username: string;
  roles?: string[];
  provider?: string;
  accessToken?: string;
  refreshToken?: string;
  avatar_url?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
  isTestUser?: boolean;
}
