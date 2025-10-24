// src/pages/Login.tsx
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

import presets from './data/loginPresets.json';
import { useMemo } from 'react';
import type { LoginPreset } from './types';

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--brand), white 30%)" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="6" fill="url(#g)" />
      <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { setAuth } = useAuth();
  const from = loc.state?.from || '/';

  // 컴포넌트 내부: 프리셋 선택 (마운트 시 1회 고정)
  const preset = useMemo<LoginPreset>(() => {
    console.log("durl dksdhk?")
    const list = presets as LoginPreset[]
    // 세션마다 고정되게 하고 싶으면 sessionStorage 시드 사용
    const seed = sessionStorage.getItem('login:presetSeed') ?? (Math.random().toString().slice(2));
      
    console.log("seed : ", seed)
    sessionStorage.setItem('login:presetSeed', seed)
    const idx = Number(seed) % list.length
    console.log("seed : ", idx)
    return list[idx]
  }, [])


  const handleSuccess = async (cred: CredentialResponse) => {
    const idToken = cred.credential;
    if (!idToken) return alert('Google 인증 실패');

    const res = await fetch(`${import.meta.env.VITE_API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
      credentials: 'include',
    });
    if (!res.ok) {
      const t = await res.text();
      return alert('로그인 실패: ' + t);
    }
    const data = await res.json();
    localStorage.setItem('auth:user', JSON.stringify(data.user));
    localStorage.removeItem('chat:userId');
    setAuth(data.user, data.access_token);
    nav(from, { replace: true });
  };

  const handleError = () => {
    console.log('Google 로그인 중 오류가 발생했습니다.');
  };

  return (
    <main
      className="min-h-dvh px-5 grid place-items-center"
      style={{
        // 파스텔 그라데이션 배경 + 은은한 노이즈
        background:
          'radial-gradient(1200px 600px at 10% -10%, color-mix(in oklab, var(--brand), white 80%) 0%, transparent 55%), radial-gradient(1000px 500px at 110% 10%, color-mix(in oklab, var(--brand), var(--bg) 70%) 0%, transparent 60%), var(--bg)',
        color: 'var(--text)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 데코 구슬 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 'auto -120px -120px auto',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--brand), white 20%), transparent 65%)',
          filter: 'blur(20px)',
          opacity: 0.7,
        }}
      />

      {/* 카드 */}
      <section
        className="w-full rounded-2xl shadow-lg"
        style={{
          maxWidth: 860,
          background: 'color-mix(in oklab, var(--panel), rgba(255,255,255,0.06))',
          border: '1px solid var(--border)',
          backdropFilter: 'saturate(140%) blur(10px)',
        }}
      >
        {/* 2열 레이아웃 (모바일 단일 컬럼) */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: '1fr',
            gap: 0,
          }}
        >
          {/* 좌측: 감성 카피/일러스트 영역 */}
          <aside
            className="hidden lg:block"
            style={{
              padding: '36px 32px',
              borderRight: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="grid place-items-center rounded-xl"
                style={{
                  width: 48,
                  height: 48,
                  background:
                    'linear-gradient(135deg, color-mix(in oklab, var(--brand), white 15%), var(--brand))',
                }}
                aria-hidden
              >
                <BrandMark />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>AppWeb</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>welcome back</div>
              </div>
            </div>

            <h2
              style={{
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.2,
                marginBottom: 14,
                letterSpacing: -0.3,
              }}
            >
              오늘의 나를 기록하고, 내일의 나를 설레게.
            </h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              가벼운 마음으로 시작하세요. 계정 하나면 어디서든 대화가 이어집니다.
            </p>

            {/* 소셜프루프 (랜덤 프리셋) */}
            <div style={{ marginTop: 26 }}>
              <div className="flex -space-x-3">
                {Array.from({ length: preset.avatarCount }).map((_, i) => {
                  const pair = preset.avatarColors[i % preset.avatarColors.length]
                  const bg = `linear-gradient(135deg, ${pair.from}, ${pair.to})`
                  return (
                    <span
                      key={i}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '2px solid var(--panel)',
                        background: bg,
                        display: 'inline-block'
                      }}
                    />
                  )
                })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                {preset.message}
              </div>
            </div>
          </aside>

          {/* 우측: 로그인 폼 */}
          <div
            className="w-full"
            style={{
              padding: '28px 22px',
            }}
          >
            {/* 모바일 헤더 (lg 아래에서만 표시) */}
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <div
                className="grid place-items-center rounded-xl"
                style={{
                  width: 44,
                  height: 44,
                  background:
                    'linear-gradient(135deg, color-mix(in oklab, var(--brand), white 20%), var(--brand))',
                }}
                aria-hidden
              >
                <BrandMark />
              </div>
              {/*
              <div>
                <h1 className="text-lg" style={{ fontWeight: 800, lineHeight: 1.2 }}>
                  로그인
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Google 계정으로 계속하기
                </p>
              </div>
              */}
            </div>

            {/* 카드형 입력 */}
            <div
              className="rounded-xl"
              style={{
                background: 'color-mix(in oklab, var(--panel), rgba(255,255,255,0.04))',
                border: '1px solid var(--border)',
                padding: 22,
              }}
            >
              <div className="hidden lg:block mb-2">
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.2 }}>로그인</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                  Google 계정으로 안전하게 시작해요
                </p>
              </div>

              <ul
                className="text-sm mb-5"
                style={{ color: 'var(--text-muted)', display: 'grid', gap: 6 }}
              >
                <li>단일 계정으로 빠르게 시작</li>
                <li>기기 간 대화 동기화</li>
                <li>안전한 인증과 저장</li>
              </ul>

              <div className="flex justify-center">
                <div style={{ minWidth: 240 }}>
                  <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    ux_mode="popup"
                    auto_select={false}
                  />
                </div>
              </div>

              <p
                className="text-xs text-center mt-4"
                style={{ color: 'var(--text-muted)' }}
              >
                계속 진행하면 서비스 <a href="#" style={{ color: 'var(--brand)' }}>이용약관</a> 및{' '}
                <a href="#" style={{ color: 'var(--brand)' }}>개인정보 처리방침</a>에 동의하게 됩니다.
              </p>
            </div>

            {/* 도움말/푸터 링크 */}
            <div
              className="flex justify-between items-center"
              style={{ marginTop: 18, fontSize: 12, color: 'var(--text-muted)' }}
            >
              <a href="#" style={{ color: 'var(--brand)' }}>계정이 없나요?</a>
              <a href="#" style={{ color: 'var(--brand)' }}>도움이 필요해요</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
