"use client"

import { TargetSite } from "../types";

type ExternalLinkProps = {
  current: TargetSite;
};
export function ExternalLink(p: ExternalLinkProps) {

  const onOpenNewTab = () => {
    window.open(p.current.href, "_blank", "noopener,noreferrer");
  };
  const onOpenAway = () => {
    window.open(p.current.href, "_self", "noopener,noreferrer");
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(p.current.href);
      // 필요하면 토스트 연결 가능(지금은 최소 구현)
      alert("링크를 복사했습니다.");
    } catch {
      alert("복사에 실패했습니다. 주소를 직접 복사해주세요.");
    }
  };

  return (
    <div className="px-6 pb-6 pt-5">
      <div className="grid gap-4 md:grid-cols-5">
        {/* 좌측: 예쁜 프리뷰 영역(iframe 자리) */}
        <div className="md:col-span-3">
          <div
            className="
              relative
              min-h-[260px]
              overflow-hidden
              rounded-3xl
              bg-gradient-to-br from-gray-50 via-white to-gray-100
              shadow-inner
              ring-1 ring-black/5
            "
          >
            {/* 상단 글로우 */}
            <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_30%_10%,rgba(0,0,0,0.08),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(0,0,0,0.06),transparent_50%)]" />

            <div className="relative flex h-full flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-white px-3 py-1 text-[11px] text-gray-600 shadow-sm ring-1 ring-black/5">
                    이 영역은 iframe 대신 “외부 링크 안내 화면”입니다
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Pop-up Mode
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-900">
                    {p.current.label}로 이동할까요?
                  </div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    이 사이트는 보안 정책으로 iframe 표시가 제한될 수 있어요.
                    <br />
                    아래 버튼으로 새 탭에서 안전하게 열 수 있습니다.
                  </div>
                </div>

                {/* URL 카드 */}
                <div className="mt-4 rounded-2xl bg-white/90 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
                  <div className="text-[11px] font-medium text-gray-500">
                    URL
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-gray-900">
                    {p.current.href}
                  </div>
                </div>
              </div>

              {/* 하단 액션 */}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={onOpenNewTab}
                  className="
                    inline-flex items-center gap-2
                    rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white
                    shadow-[0_14px_36px_rgba(0,0,0,0.18)]
                    hover:bg-gray-800 active:scale-[0.98]
                  "
                >
                  ↗ 새 탭에서 열기
                </button>
                <button
                  onClick={onCopy}
                  className="
                    inline-flex items-center gap-2
                    rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-800
                    shadow-sm ring-1 ring-black/5
                    hover:bg-gray-50 active:scale-[0.98]
                  "
                >
                  ⧉ 링크 복사
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 안내/주의 카드 */}
        <div className="md:col-span-2">
          <div className="rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
            <div className="text-sm font-semibold text-gray-900">
              안내
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-gray-600">
              <li className="flex gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  일부 사이트는 보안 정책으로 iframe 임베드가 차단됩니다.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  새 탭 열기는 <b>noopener/noreferrer</b>로 안전하게 처리됩니다.
                </span>
              </li>
            </ul>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4 shadow-inner ring-1 ring-black/5">
              <div className="text-[11px] font-medium text-gray-500">
                이동 대상
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-900">
                {p.current.desc ?? p.current.label}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {p.current.href}
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={onOpenAway}
                className="
                  w-full rounded-2xl bg-black px-4 py-3
                  text-sm font-medium text-white
                  shadow-[0_14px_36px_rgba(0,0,0,0.18)]
                  hover:bg-gray-800 active:scale-[0.98]
                "
              >
                ↗ 바로 열기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

