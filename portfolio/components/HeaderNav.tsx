// components/HeaderNav.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import type { NavItem } from '@/types/nav';

type Props = { items: NavItem[] };

export default function HeaderNav({ items }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [_open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 ... 팝오버 닫기
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  const goMenu = (href: string) => {
    if (href === '/builder') {
      // 상세 → 리스트로 돌아가게 상태 초기화 신호
      window.dispatchEvent(new CustomEvent('builder:reset'));
    }
    
    router.push(`${href}`);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {/* 동적 메뉴 버튼들 */}
      {items.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <button
            key={item.id}
            onClick={() => goMenu(item.href)}
            aria-current={active ? 'page' : undefined}
            className={[
              'h-8 px-3 rounded-md text-sm transition hover:cursor-pointer',
              active ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-200',
            ].join(' ')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
 