"use client";

import { useMemo, useState } from "react";
import { type TargetSite } from "./types";
import { IframeCard } from "./components/IframeCard";
import { ExternalLink } from "./components/ExternalLink";

export default function IframePage() {
  const targets: TargetSite[] = useMemo(
    () => [
      {
        key: "health",
        label: "홈트레이닝",
        desc: "Hams Health",
        href: "https://hams-health.vercel.app",
        isPopup: true,
      },
      {
        key: "todos",
        label: "Todos",
        desc: "Hams Todos",
        href: "https://hamsfam-todos.vercel.app/todos",
        isPopup: true,
      },
      {
        key: "naver",
        label: "네이버",
        desc: "NAVER",
        href: "https://www.naver.com",
        isPopup: true,
      },
      {
        key: "google",
        label: "구글",
        desc: "Google",
        href: "https://www.google.com",
        isPopup: true,
      },
    ],
    []
  );

  const [selected, setSelected] = useState<TargetSite["key"]>("health");
  const current: TargetSite = targets.find((t) => t.key === selected) ?? targets[0];

  function openExternal(url: string) {
    // 바로 팝업 호출
    // window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-2">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              타 서비스 이동{" "}
              <span className="ml-1 text-sm font-normal text-gray-500">
                (다른 사이트를 iframe 또는 새탭으로 연결)
              </span>
            </h1>
            <div className="mt-1 text-xs text-gray-500">
              선택된 서비스: <span className="font-medium text-gray-900">{current.desc}</span>
            </div>
          </div>

          {/* 버튼 영역(선택 상태 pill) */}
          <div
            className="
              inline-flex items-center gap-1.5
              rounded-2xl bg-white/80 p-1.5
              shadow-[0_12px_30px_rgba(0,0,0,0.10)]
              ring-1 ring-black/5
              backdrop-blur
            "
          >
            {targets.map((t) => {
              const active = t.key === selected;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    if (t.isPopup ?? false) openExternal(t.href);
                    setSelected(t.key);
                  }}
                  className={[
                    "group relative inline-flex items-center gap-2",
                    "rounded-2xl px-4 py-2 text-sm font-medium transition",
                    "active:scale-[0.98]",
                    active
                      ? "bg-black text-white shadow-[0_10px_26px_rgba(0,0,0,0.22)]"
                      : "bg-white text-gray-700 ring-1 ring-black/5 hover:bg-gray-50 hover:shadow-sm",
                  ].join(" ")}
                >
                  {/* 미니 dot */}
                  <span
                    className={[
                      "h-2 w-2 rounded-full transition",
                      active ? "bg-emerald-300" : "bg-gray-300 group-hover:bg-gray-400",
                    ].join(" ")}
                  />
                  {t.label}

                  {/* hover tooltip 느낌 */}
                  <span
                    className="
                      pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2
                      whitespace-nowrap rounded-xl bg-black px-3 py-1.5
                      text-[11px] text-white opacity-0 shadow-lg
                      transition group-hover:opacity-100
                    "
                  >
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 min-h-0">
        { current.isPopup ? <ExternalLink current={current} /> : <IframeCard src={current.href} /> }
      </div>
    </div>
  );
}