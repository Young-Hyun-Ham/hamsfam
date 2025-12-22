"use client";

import usePublicFaqStore from "../store";
import type { PublicFaq } from "../types";

function fmt(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function FaqAccordionList({ items }: { items: PublicFaq[] }) {
  const { openId, toggleOpen } = usePublicFaqStore();

  if (!items.length) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-sm font-semibold">검색 결과가 없습니다.</div>
        <div className="mt-1 text-xs text-gray-500">
          다른 키워드로 다시 검색해보세요.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const open = openId === it.id;
        return (
          <div
            key={it.id}
            className="rounded-2xl bg-white shadow-sm transition hover:shadow-md"
          >
            <button
              className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
              onClick={() => toggleOpen(it.id)}
            >
              <div className="min-w-0">
                <div className="text-xs text-gray-500">{it.category}</div>
                <div className="mt-1 truncate text-sm font-semibold">
                  {it.question}
                </div>
              </div>

              <div className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">
                {open ? "닫기" : "열기"}
              </div>
            </button>

            {open && (
              <div className="px-5 pb-5">
                <div className="rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-800">
                  {it.answer}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(it.tags ?? []).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600 shadow-sm"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  {it.updatedAt ? (
                    <div className="text-[11px] text-gray-400">
                      업데이트: {fmt(it.updatedAt)}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
