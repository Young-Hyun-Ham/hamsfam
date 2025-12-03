// app/(siderbar-header)/admin/page.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/store";

function shorten(token?: string | null, head = 6, tail = 6) {
  if (!token) return "-";
  if (token.length <= head + tail) return token;
  return `${token.slice(0, head)}…${token.slice(-tail)}`;
}

export default function MainDashboardPage() {
  const user = useStore((s: any) => s.user);
  const backend = useStore((s: any) => s.backend); // "firebase" | "postgres" 등

  const provider =
    user?.providerData?.[0]?.providerId ?? user?.providerId ?? "-";
  const displayName =
    user?.displayName ?? user?.user?.displayName ?? "손님";
  const email = user?.email ?? user?.user?.email ?? "-";
  const photoURL =
    user?.photoURL ??
    user?.user?.photoURL ??
    "https://avatars.githubusercontent.com/u/9919?s=200&v=4"; // 임시 아바타

  const refreshToken =
    user?.stsTokenManager?.refreshToken ??
    user?.refreshToken ??
    user?.proactiveRefresh?.user?.stsTokenManager?.refreshToken ??
    null;

  const accessToken =
    user?.stsTokenManager?.accessToken ??
    user?.accessToken ??
    user?.proactiveRefresh?.user?.stsTokenManager?.accessToken ??
    null;

  const lastLoginAt =
    user?.metadata?.lastLoginAt ??
    user?.proactiveRefresh?.user?.metadata?.lastLoginAt ??
    null;

  const createdAt =
    user?.metadata?.createdAt ??
    user?.proactiveRefresh?.user?.metadata?.createdAt ??
    null;

  const rawJson = useMemo(
    () => (user ? JSON.stringify(user, null, 2) : "// 로그인된 사용자가 없습니다."),
    [user],
  );

  function handleCopy(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* 상단 인사 + 상태 뱃지 */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">대시보드</p>
            <h1 className="text-2xl font-semibold text-gray-900">
              안녕하세요, <span className="font-bold">{displayName}</span>님
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              빌더에서 만든 플로우를 채팅에서 바로 테스트할 수 있는{" "}
              <span className="font-semibold text-indigo-500">
                Hamsfam AI Studio
              </span>
              입니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              접속 중
            </span>
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Backend: {backend ?? "firebase"}
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              Provider: {provider}
            </span>
          </div>
        </section>

        {/* 상단 그리드: 프로필 / 토큰+퀵 액션 */}
        <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* 프로필 카드 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoURL}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {displayName}
                </p>
                <p className="truncate text-xs text-gray-500">{email}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-gray-500">
                  {createdAt && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      가입: {createdAt}
                    </span>
                  )}
                  {lastLoginAt && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      마지막 로그인: {lastLoginAt}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 text-[11px] font-medium text-gray-500">
                  역할(ROLE)
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {Array.isArray(user?.roles)
                    ? user.roles.join(", ")
                    : user?.roles ?? "user"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 text-[11px] font-medium text-gray-500">
                  인증 상태
                </p>
                <p className="text-sm font-semibold text-emerald-600">
                  {user ? "로그인됨" : "로그아웃"}
                </p>
              </div>
            </div>
          </div>

          {/* 토큰 + 퀵 액션 영역 */}
          <div className="flex flex-col gap-4">
            {/* 토큰 카드 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    인증 토큰
                  </h2>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                  Firebase Auth
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[11px] font-medium text-gray-500">
                    Access Token
                  </span>
                  <code className="flex-1 truncate rounded-lg bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-700">
                    {shorten(accessToken)}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(accessToken ?? "")}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100"
                  >
                    복사
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[11px] font-medium text-gray-500">
                    Refresh Token
                  </span>
                  <code className="flex-1 truncate rounded-lg bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-700">
                    {shorten(refreshToken)}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(refreshToken ?? "")}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100"
                  >
                    복사
                  </button>
                </div>
              </div>
            </div>

            {/* 퀵 액션 카드 */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 p-[1px] shadow-sm">
              <div className="flex h-full flex-col justify-between gap-3 rounded-[18px] bg-white px-5 py-4 text-gray-900">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-indigo-500">
                    Quick actions
                  </p>
                  <h2 className="mt-1 text-sm font-semibold">
                    오늘은 어떤 플로우를 만들까요?
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Builder에서 시나리오를 설계하고 Chatbot에서 실시간으로
                    AI 대화를 테스트해보세요.
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href="/builder"
                    className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    빌더 열기
                  </Link>
                  <Link
                    href="/chatbot"
                    className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-medium text-indigo-600 border border-indigo-100 hover:bg-indigo-50"
                  >
                    AI 채팅 시작
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Raw JSON 디버그 영역 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <span className="text-sm font-medium text-gray-800">
                디버그용 원본 사용자 데이터
              </span>
              <span className="text-xs text-gray-500 group-open:hidden">
                펼치기 ▼
              </span>
              <span className="hidden text-xs text-gray-500 group-open:inline">
                접기 ▲
              </span>
            </summary>
            <div className="mt-3 rounded-xl bg-gray-900 p-3 text-xs text-gray-100">
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                {rawJson}
              </pre>
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
