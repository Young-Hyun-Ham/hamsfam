// lib/api/auth.ts

export type AppUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isTestUser?: boolean;
};

type LoginResponse = {
  user: AppUser;
  accessToken: string;
};

// 이메일/패스워드 로그인 예시
export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error('Login failed');
  }
  console.log("fhrmdls : ", res.json())
  return res.json();
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
export async function getMeApi(token: string): Promise<AppUser> {
  const res = await fetch('/api/auth/me', {
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
