// app/store/index.ts
'use client';

import { create } from 'zustand';
import { createAuthSlice, AuthState } from './slice/authSlice';

type RootState = AuthState & {
  // 여기에 UI slice 등 추가 가능
};

export const useStore = create<RootState>()((...a) => ({
  ...createAuthSlice(...a),
}));
