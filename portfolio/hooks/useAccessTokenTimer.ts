'use client';

import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

type JwtPayload = {
  exp?: number; // 만료 시간 (초 단위 UNIX 타임)
  [key: string]: any;
};

export function useAccessTokenTimer(accessToken?: string | null) {
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setRemainingSec(null);
      return;
    }

    let expMs: number | null = null;

    try {
      const decoded = jwtDecode<JwtPayload>(accessToken);
      if (decoded.exp) {
        expMs = decoded.exp * 1000;
      }
    } catch (e) {
      console.error('Failed to decode access token', e);
      setRemainingSec(null);
      return;
    }

    if (!expMs) {
      setRemainingSec(null);
      return;
    }

    const calc = () => {
      const now = Date.now();
      const diff = Math.floor((expMs! - now) / 1000); // 초 단위
      setRemainingSec(diff > 0 ? diff : 0);
    };

    // 즉시 한 번 계산
    calc();

    // 1초마다 갱신
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [accessToken]);

  // mm:ss 포맷
  let display = '--:--';
  if (remainingSec !== null) {
    const m = Math.floor(remainingSec / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(remainingSec % 60)
      .toString()
      .padStart(2, '0');
    display = `${m}:${s}`;
  }

  return { remainingSec, display };
}
