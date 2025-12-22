"use client";

import usePublicFaqStore from "../store";
import { FAQ_CATEGORIES } from "../types";

export default function FaqCategoryChips() {
  const { query, setQuery } = usePublicFaqStore();
  const active = query.category ?? "all";

  return (
    <div className="flex flex-wrap gap-2">
      {FAQ_CATEGORIES.map((c) => {
        const on = c.key === active;
        return (
          <button
            key={c.key}
            onClick={() => setQuery({ category: c.key })}
            className={[
              "rounded-full px-3 py-1.5 text-xs transition shadow-sm",
              on
                ? "bg-black text-white"
                : "bg-white text-gray-700 hover:shadow-md",
            ].join(" ")}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
