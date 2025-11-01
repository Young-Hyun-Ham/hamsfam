'use client';

import Link from 'next/link';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { SidebarMenu } from '@/types/nav';

type Props = { items: SidebarMenu[] };

// 정렬 헬퍼
function byOrder<T extends { order?: number }>(a: T, b: T) {
  return (a.order ?? 0) - (b.order ?? 0);
}

// 트리 노드 타입
type Node = SidebarMenu & { children: Node[] };

export default function SidebarMenus({ items }: Props) {
  const pathname = usePathname();

  // id -> 항목 인덱스
  const idIndex = useMemo(() => {
    const map = new Map<string, SidebarMenu>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  const parentIndex = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const it of items) map.set(it.id, it.up_id);
    return map;
  }, [items]);

  // parentId -> children 목록 인덱스
  const byParent = useMemo(() => {
    const m = new Map<string, SidebarMenu[]>();
    for (const it of items) {
      const key = it.up_id ?? '';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    for (const v of m.values()) v.sort(byOrder);
    return m;
  }, [items]);

  const buildChildren = useCallback(
    (parentId: string): Node[] =>
      (byParent.get(parentId) ?? []).map((it) => ({
        ...it,
        children: buildChildren(it.id),
      })),
    [byParent]
  );

  // 루트 섹션은 lev === 2 (요구사항 유지)
  const roots = useMemo(
    () =>
      items
        .filter((i) => i.lev === 2)
        .sort(byOrder)
        .map<Node>((g) => ({ ...g, children: buildChildren(g.id) })),
    [items, buildChildren]
  );

  // 토글 상태 (모든 id에 대해 관리)
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // 현재 경로에 해당하는 노드를 찾아 조상들을 자동으로 펼침(초기 UX 개선)
  useEffect(() => {
    if (!pathname) return;

    // href === pathname인 아이템 찾기
    const current = items.find((it) => it.href === pathname);
    if (!current) return;

    // 조상 id들을 수집해서 open 처리
    const toOpen: string[] = [];
    let pid = current.up_id;
    while (pid) {
      toOpen.push(pid);
      pid = parentIndex.get(pid);
    }
    if (toOpen.length) {
      setOpen((prev) => {
        const next = { ...prev };
        for (const id of toOpen) next[id] = true;
        return next;
      });
    }
  }, [items, pathname, parentIndex]);

  return (
    <nav className="p-3 text-sm select-none">
      {roots.map((group) => {
        const isOpen = !!open[group.id];
        const children = group.children ?? [];
        return (
          <div key={`g-${group.id}`} className="mb-2">
            {/* 섹션 헤더(lev2) - 토글 버튼 */}
            <button
              type="button"
              onClick={() => toggle(group.id)}
              className="w-full flex items-center justify-between rounded px-2 py-1 hover:bg-gray-50"
              aria-expanded={isOpen}
              aria-controls={`sec-${group.id}`}
            >
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {group.label}
              </span>
              <span className="flex items-center gap-2 text-gray-500">
                {children.length > 0 && (
                  <span className="text-[10px]">{children.length}</span>
                )}
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </span>
            </button>

            {/* 섹션 아이템 (lev3+) */}
            <ul
              id={`sec-${group.id}`}
              className={`mt-1 overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${
                isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <Tree
                nodes={children}
                depth={1}
                pathname={pathname}
                open={open}
                onToggle={toggle}
              />
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** 재귀 렌더링 컴포넌트 */
function Tree({
  nodes,
  depth,
  pathname,
  open,
  onToggle,
}: {
  nodes: Node[];
  depth: number; // 들여쓰기 단계 (lev3=1부터 시작)
  pathname: string;
  open: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (!nodes?.length) return null;

  // path_ids로부터 URL 경로 생성
  function urlFromPathIds(pathIds?: string) {
    if (!pathIds) return '#';
    const segs = pathIds
      .split('>')
      .map(s => s.trim())
      .filter(Boolean)
      .map(encodeURIComponent); // 공백/한글 대비
    return '/' + segs.join('/');
  }

  return (
    <>
      {nodes.map((node) => {
        const hasChildren = (node.children?.length ?? 0) > 0;
        const isParent = hasChildren || !node.href; // href 없으면 부모로 처리
        const isOpen = !!open[node.id];
        // const active = !!node.href && pathname === node.href;

        const computedPath = urlFromPathIds(node.path_ids);
        const active = pathname === computedPath;

        return (
          <li key={node.id}>
            {/* 항목 헤더: 부모는 토글 버튼, 리프는 링크 */}
            <div
              className="flex items-center justify-between rounded hover:bg-gray-50"
              style={{ paddingLeft: depth * 12, paddingRight: 8, paddingTop: 6, paddingBottom: 6 }}
            >
              {isParent ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  className="flex-1 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`sec-${node.id}`}
                >
                  <span className="text-gray-700">{node.label}</span>
                </button>
              ) : (
                <Link
                  href={{                           // 객체 형태로 전달하면 query도 함께 보낼 수 있음
                    pathname: computedPath,         // 👉 "/admin/users/create" 같은 최종 경로
                    query: { depth, path_ids: node.path_ids }, // 필요하면 그대로 유지
                  }}
                  className={[
                    'flex-1 rounded px-1 py-0.5 hover:bg-gray-100',
                    active ? 'bg-gray-100 font-medium' : '',
                  ].join(' ')}
                >
                  {node.label}
                </Link>
              )}

              {/* 토글 아이콘 (부모일 때만) */}
              {isParent && (
                <ChevronRight
                  className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              )}
            </div>

            {/* 하위 트리 */}
            {isParent && (
              <ul
                id={`sec-${node.id}`}
                className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${
                  isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <Tree
                  nodes={node.children}
                  depth={depth + 1}
                  pathname={pathname}
                  open={open}
                  onToggle={onToggle}
                />
              </ul>
            )}
          </li>
        );
      })}
    </>
  );
}
