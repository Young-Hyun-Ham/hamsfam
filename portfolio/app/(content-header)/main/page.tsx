// app/(content-header)/main/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/store";

export default function MainPage() {
  const user = useStore((s: any) => s.user);
  console.log("MainPage user: =========================> ", user);
  const displayName =
    user?.displayName ?? user?.user?.displayName ?? "손님";
  const email = user?.email ?? user?.user?.email ?? "";
  const photoURL =
    user?.photoURL ??
    user?.user?.photoURL ??
    "https://avatars.githubusercontent.com/u/9919?s=200&v=4";

  const [keyword, setKeyword] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    // TODO: 실제 검색 로직 연결
    console.log("검색:", keyword);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* 상단 인사 + 검색 영역 (네이버 메인 느낌) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {displayName}님, 환영합니다
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                빌더에서 만든 시나리오를 한 곳에서 관리하고,
                채팅에서 바로 AI와 대화해 보세요.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              {/* 간단 프로필 요약 */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-gray-800 text-xs font-medium">
                    {displayName}
                  </p>
                  {email && (
                    <p className="truncate text-[11px] text-gray-500">
                      {email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 검색 박스 */}
          <form
            onSubmit={handleSearch}
            className="mx-auto w-full rounded-2xl bg-white shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-3"
          >
            <span className="text-sm text-gray-400">🔍</span>
            <input
              className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
              placeholder="시나리오, 빌더 이름, 메모 등 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
            >
              검색
            </button>
          </form>

          {/* 바로가기 버튼들 */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/builder"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 border border-gray-200 shadow-sm hover:bg-gray-50"
            >
              🧩 <span>빌더 열기</span>
            </Link>
            <Link
              href="/chatbot"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 border border-gray-200 shadow-sm hover:bg-gray-50"
            >
              💬 <span>AI 채팅 시작</span>
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 border border-gray-200 shadow-sm hover:bg-gray-50"
            >
              🕒 <span>최근 대화 보기</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-200"
            >
              ⚙️ <span>관리자 대시보드</span>
            </Link>
          </div>
        </section>

        {/* 메인 콘텐츠 2컬럼 (네이버 섹션 느낌) */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* 왼쪽 - 빌더/채팅 요약 영역 */}
          <div className="space-y-4">
            {/* 오늘의 빌더 / 추천 영역 */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  오늘의 추천 빌더
                </h2>
                <Link
                  href="/builder"
                  className="text-[11px] text-gray-500 hover:text-gray-700"
                >
                  더보기 &gt;
                </Link>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">
                      상담 챗봇 기본 시나리오
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      FAQ 기반 상담 / 안내용 템플릿
                    </p>
                  </div>
                  <Link
                    href="/builder"
                    className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-600 hover:bg-indigo-100"
                  >
                    빌더 열기
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">
                      예약/접수 폼 챗봇
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      이름, 연락처, 일자 등 슬롯 수집 템플릿
                    </p>
                  </div>
                  <Link
                    href="/builder"
                    className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                  >
                    미리보기
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">
                      내부 업무 가이드 봇
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      매뉴얼 요약/검색용 시나리오
                    </p>
                  </div>
                  <Link
                    href="/builder"
                    className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                  >
                    편집
                  </Link>
                </li>
              </ul>
            </div>

            {/* 최근 채팅/히스토리 요약 */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  최근 채팅
                </h2>
                <Link
                  href="/chat"
                  className="text-[11px] text-gray-500 hover:text-gray-700"
                >
                  전체 보기 &gt;
                </Link>
              </div>
              <ul className="space-y-2 text-xs">
                {/* TODO: 실제 최근 대화 리스트로 교체 */}
                <li className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-gray-800">
                      고객센터 QA 챗봇 · 어제
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      “반품은 어떻게 진행되나요?” 외 5건
                    </p>
                  </div>
                  <Link
                    href="/chat"
                    className="shrink-0 text-[11px] text-indigo-600 hover:underline"
                  >
                    이어서 보기
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-gray-800">
                      사내 규정 안내 봇 · 2일 전
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      “연차 사용 규정 알려줘” 외 2건
                    </p>
                  </div>
                  <Link
                    href="/chat"
                    className="shrink-0 text-[11px] text-indigo-600 hover:underline"
                  >
                    기록 보기
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* 오른쪽 - 프로필/공지/도움말 영역 */}
          <aside className="space-y-4">
            {/* 간단 프로필 카드 (모바일에서도 보이게 별도) */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
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
                  {email && (
                    <p className="truncate text-[11px] text-gray-500">
                      {email}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  🔐 Firebase 로그인
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  🧩 빌더 &amp; 채팅 연동
                </span>
              </div>
            </div>

            {/* 공지/업데이트 영역 */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">
                공지 & 업데이트
              </h2>
              <ul className="space-y-1 text-xs text-gray-700">
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate">
                    새 빌더 노드 타입 “슬롯 채우기”가 추가되었습니다.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span className="truncate">
                    채팅 화면에서 실시간 스트리밍 속도가 개선되었습니다.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span className="truncate">
                    Admin &gt; 대시보드에서 Firebase / Postgres 상태를 확인할 수 있습니다.
                  </span>
                </li>
              </ul>
            </div>

            {/* 도움말 / 시작 가이드 */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">
                처음이신가요?
              </h2>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
                <li>빌더에서 기본 템플릿을 복사하여 나만의 시나리오를 만듭니다.</li>
                <li>채팅 메뉴에서 방을 선택하고, 방에 시나리오를 연결합니다.</li>
                <li>사용자 질문을 넣어 실제 대화 흐름을 테스트해 봅니다.</li>
              </ol>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <Link
                  href="/builder"
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-600 hover:bg-indigo-100"
                >
                  튜토리얼 빌더 열기
                </Link>
                <Link
                  href="/chatbot"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-700 hover:bg-gray-50"
                >
                  샘플 챗봇 실행
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
