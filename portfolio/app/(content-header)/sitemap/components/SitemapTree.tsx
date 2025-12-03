// app/(content-header)/sitemap/components/SitemapTree.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type MenuItem = {
  id?: string;
  menu_id: string;
  label: string;
  href: string | null;
  order: number | null;
  lev: number;
  up_id: string | null;
};

type SitemapNode = MenuItem & {
  children: SitemapNode[];
};

type Props = {
  items: MenuItem[];
};

/** 문자 기반 자동 썸네일 SVG 아이콘 */
function AutoThumbnailIcon({
  menuId,
  label,
}: {
  menuId: string;
  label: string;
}) {
  const baseText = (label || menuId || "?").trim();
  const text =
    baseText.length <= 2 ? baseText : baseText.slice(0, 2);

  const palette = [
    ["#4F46E5", "#6366F1"], // indigo
    ["#059669", "#10B981"], // emerald
    ["#2563EB", "#3B82F6"], // blue
    ["#DB2777", "#EC4899"], // pink
    ["#0EA5E9", "#22C55E"], // cyan
    ["#9333EA", "#A855F7"], // purple
    ["#EA580C", "#F97316"], // orange
  ];
  const idx =
    Math.abs(
      [...menuId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
    ) % palette.length;
  const [c1, c2] = palette[idx];
  const gradId = `thumb-grad-${menuId}`;

  return (
    <svg
      viewBox="0 0 120 72"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width="120"
        height="72"
        rx="16"
        fill={`url(#${gradId})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontWeight="700"
        fontSize={text.length === 1 ? 36 : 30}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        {text}
      </text>
    </svg>
  );
}
/** 공통: 메뉴 트리 구성 (up_id = 부모 id 또는 menu_id 둘 다 지원) */
function buildTree(items: MenuItem[]): SitemapNode[] {
  const byId = new Map<string, SitemapNode>();
  const byMenuId = new Map<string, SitemapNode>();
  const nodes: SitemapNode[] = items.map((item) => ({
    ...item,
    children: [],
  }));
  const roots: SitemapNode[] = [];

  // 1) 노드들을 id / menu_id 두 가지 키로 모두 등록
  nodes.forEach((node) => {
    if (node.id) {
      byId.set(String(node.id), node);
    }
    byMenuId.set(node.menu_id, node);
  });

  // 2) up_id 기준으로 부모 찾아서 children에 붙이기
  nodes.forEach((node) => {
    if (node.up_id) {
      const parent =
        byId.get(String(node.up_id)) || byMenuId.get(node.up_id);

      if (parent) {
        parent.children.push(node);
        return;
      }
    }
    // up_id 없거나 부모 못 찾으면 루트 취급
    roots.push(node);
  });

  // 3) 정렬
  const sortNodes = (nodes: SitemapNode[]) => {
    nodes.sort((a, b) => {
      const ao = a.order ?? 999;
      const bo = b.order ?? 999;
      if (ao !== bo) return ao - bo;
      return a.label.localeCompare(b.label, "ko");
    });
    nodes.forEach((n) => sortNodes(n.children));
  };

  sortNodes(roots);
  return roots;
}


/** 자식 카드 (Admin 말고, 루트 카드 안에서 쓰는 용도) */
function ChildCard({
  node,
  parentLabel,
}: {
  node: SitemapNode;
  parentLabel: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-800">
            {node.label}
          </p>
          <p className="truncate text-[11px] text-gray-400">
            {parentLabel} &gt; {node.label}
          </p>
        </div>
        {node.href && (
          <Link
            href={node.href}
            className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-indigo-600 border border-indigo-100 hover:bg-indigo-50"
          >
            이동
          </Link>
        )}
      </div>

      {/* 손자 메뉴(3레벨 이상)는 칩 리스트로 */}
      {node.children.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {node.children.map((g) => (
            <Link
              key={g.menu_id}
              href={g.href ?? "#"}
              className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-600 border border-gray-200 hover:bg-gray-100"
            >
              {g.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** ✅ 1레벨 메뉴용 썸네일 카드 그리드 */
export function SitemapTree({ items }: Props) {
  const tree = useMemo(() => buildTree(items), [items]);
  // 1레벨 메뉴만 메인 카드로
  const roots = tree.filter((n) => n.lev === 1);

  if (!roots.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        1레벨 메뉴가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {roots.map((node) => (
        <div
          key={node.menu_id}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3"
        >
          {/* 썸네일 */}
          <div className="h-28 w-full overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center">
            <AutoThumbnailIcon
              menuId={node.menu_id}
              label={node.label}
            />
          </div>

          {/* 타이틀 + 버튼 */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                {node.label}
              </h3>
              <p className="mt-0.5 text-[11px] text-gray-400">
                메뉴 ID: {node.menu_id} · Level {node.lev}
              </p>
            </div>
            {node.href && (
              <Link
                href={node.href}
                className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-100 hover:bg-indigo-100"
              >
                페이지 이동
              </Link>
            )}
          </div>

          {/* 하위 메뉴 카드 */}
          {node.children.length > 0 && (
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {node.children.map((child) => (
                <ChildCard
                  key={child.menu_id}
                  node={child}
                  parentLabel={node.label}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** ✅ Admin 섹션용 트리 (펼침/접기) */
export function AdminTree({ items }: Props) {
  const tree = useMemo(() => buildTree(items), [items]);
  const adminRoot = tree.find((n) => n.menu_id === "admin");

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(adminRoot ? [adminRoot.menu_id] : []),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!adminRoot) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        admin 메뉴가 없습니다.
      </div>
    );
  }

  const renderNode = (node: SitemapNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.menu_id);
    const indent = depth * 16;

    return (
      <div key={node.menu_id}>
        <div
          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer"
          style={{ marginLeft: indent }}
        >
          <div
            className="flex items-center gap-2 min-w-0"
            onClick={() => hasChildren && toggle(node.menu_id)}
          >
            {/* 토글 아이콘 */}
            {hasChildren ? (
              <span className="text-xs text-gray-500 w-4">
                {isOpen ? "▾" : "▸"}
              </span>
            ) : (
              <span className="w-4" />
            )}

            {/* 라벨 + 링크 */}
            {node.href ? (
              <Link
                href={node.href}
                className="truncate text-sm text-gray-800 hover:text-indigo-600"
              >
                {node.label}
              </Link>
            ) : (
              <span className="truncate text-sm text-gray-800">
                {node.label}
              </span>
            )}

            <span className="text-[11px] text-gray-400">
              ({node.menu_id})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {node.href && (
              <Link
                href={node.href}
                className="text-[11px] text-indigo-600 hover:underline"
              >
                이동
              </Link>
            )}
            <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400">
              L{node.lev}
            </span>
          </div>
        </div>

        {hasChildren && isOpen && (
          <div>
            {node.children.map((child) =>
              renderNode(child, depth + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {renderNode(adminRoot, 0)}
    </div>
  );
}
