// lib/api/auth.ts

import { User } from "@/types/user";

type LoginResponse = {
  user: User;
  accessToken: string;
};

// 이메일/패스워드 로그인 예시
export async function postgresLoginApi(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login/postgres', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  console.log("loginApi response:", res);

  if (!res.ok) {
    throw new Error('Login failed');
  }
  return res.json();
  // return await api.post('/api/auth/login', { email, password }, { withCredentials: true, });
}

// 이메일/패스워드 로그인 예시
export async function firebaseLoginApi(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login/firebase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  console.log("loginApi response:", res);

  if (!res.ok) {
    throw new Error('Login failed');
  }
  return res.json();
  // return await api.post('/api/auth/login', { email, password }, { withCredentials: true, });
}

// 테스트 로그인 (id=xxx 로 들어오는 케이스)
export async function loginWithTestIdApi(testId: string): Promise<LoginResponse> {
  const res = await fetch('/api/auth/test-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testId }),
  });

  if (!res.ok) {
    throw new Error('Test login failed');
  }

  return res.json();
}

// 토큰으로 현재 유저 조회
export async function postgresGetMeApi(token: string): Promise<User> {
  const res = await fetch('/api/auth/me/postgres', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Unauthorized');
  }

  return res.json();
}

// 토큰으로 현재 유저 조회
export async function firebaseGetMeApi(token: string): Promise<User> {
  const res = await fetch('/api/auth/me/firebase', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Unauthorized');
  }

  return res.json();
}

export async function logoutApi(token: string) {
  // 필요 없으면 이 API는 생략해도 됨(프론트에서 토큰만 지우는 방식)
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
