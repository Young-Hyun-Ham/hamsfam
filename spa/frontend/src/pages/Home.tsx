// src/pages/Home.tsx
import React from 'react'

type StatCardProps = {
  label: string
  value: string
  hint?: string
}
function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <section className="cardify">
      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {hint && <div style={{ color: 'var(--muted)', marginTop: 6 }}>{hint}</div>}
    </section>
  )
}

function SectionCard({
  title,
  children,
  footer,
}: {
  title: string
  children?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <section className="cardify">
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
      </header>
      <div>{children}</div>
      {footer && <footer className="mt-4" style={{ color: 'var(--muted)' }}>{footer}</footer>}
    </section>
  )
}

export default function Home() {
  return (
    <div className="grid grid-1 lg:grid-2">
      {/* 왼쪽 컬럼: 본문 */}
      <div className="grid grid-1">
        {/* 페이지 헤더 */}
        <section className="cardify">
          <h2 style={{ margin: 0 }}>Home</h2>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>
            앱웹 스타일 반응형 레이아웃 샘플
          </p>
        </section>

        {/* KPI 카드 3개 (모바일 1열 → 데스크톱 3열) */}
        <div className="grid grid-1 lg:grid-3">
          <StatCard label="오늘 할일" value="12" hint="완료 5 / 진행중 4 / 대기 3" />
          <StatCard label="알림" value="3" hint="새로운 업데이트" />
          <StatCard label="사용량" value="72%" hint="이번 주 기준" />
        </div>

        {/* 섹션 리스트 */}
        <SectionCard title="빠른 시작">
          <div className="grid grid-1 lg:grid-2">
            <button>새 프로젝트</button>
            <button className="mt-2 lg:mt-0">가져오기</button>
          </div>
        </SectionCard>

        <SectionCard title="최근 활동" footer="최근 7일의 히스토리만 표시됩니다.">
          <div className="grid grid-1">
            <div className="card">섹션 1</div>
            <div className="card">섹션 2</div>
            <div className="card">섹션 3</div>
          </div>
        </SectionCard>
      </div>

      {/* 오른쪽 컬럼: 사이드 패널 */}
      <aside className="grid grid-1">
        <SectionCard title="퀵 액션">
          <div className="grid grid-2">
            <button>새 메모</button>
            <button>업로드</button>
          </div>
        </SectionCard>

        <SectionCard title="필터 & 검색">
          <div className="row">
            <input type="search" placeholder="검색어를 입력하세요" />
            <button>검색</button>
          </div>
        </SectionCard>

        <SectionCard title="위젯">
          <div className="grid grid-1">
            <div className="card">공지 위젯</div>
            <div className="card">달력 위젯</div>
          </div>
        </SectionCard>
      </aside>
    </div>
  )
}
