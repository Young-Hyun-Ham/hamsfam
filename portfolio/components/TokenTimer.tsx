// app/components/TokenTimer.tsx
'use client';

import { memo, useEffect, useState } from 'react';
import { useStore } from '@/store';
import { useAccessTokenTimer } from '@/hooks/useAccessTokenTimer';

const TokenTimer = memo(function TokenTimer() {
  const authChecked = useStore((s: any) => s.authChecked);
  const accessToken = useStore((s: any) => s.token);
  // authChecked 되기 전에는 토큰을 넘기지 않도록 제어 (선택 사항)
  const { display } = useAccessTokenTimer(authChecked ? accessToken : null);

  return <span className="tabular-nums text-gray-900">{display}</span>;
});

export default TokenTimer;
