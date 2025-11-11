import NextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

type Params = Promise<{ slug: string }>;

// 필요하면 허용 목록을 엄격히 관리
// const VALID = new Set(['0001', '0002', '0003', '0004']);

export default async function ModulePage({ params }: { params: Params; }) {
  const { slug } = await params;   // 반드시 await 로 풀기

  // slug 검증 (선택)
  if (!/^\d{4}$/.test(slug)) {
    notFound();
  }

  // 디렉터리 내의 파일을 동적으로 import (webpack이 context로 묶어줍니다)
  const Mod = NextDynamic(() => import(`@/app/(siderbar-header)/admin/modules/${slug}`), {
    loading: () => <div className="p-6 text-sm text-gray-500">로딩 중…</div>,
    // ssr: true 기본값이면 충분. 모듈이 클라이언트 전용이면 그 파일에 'use client' 선언
  });

  return <Mod />;
}

export const dynamic = 'force-dynamic'; // 항상 최신 로딩 (필요 시)
