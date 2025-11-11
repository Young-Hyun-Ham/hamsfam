// src/store/slices/scenarioSlice.ts
'use client';

import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, addDoc } from '@/lib/firebase';
import type { Scenarios } from '@/app/(content-header)/builder/types/types';

export const scenarioSlice = (set: any, get: any) => ({
  // 데이터
  scenarios: [],
  scenario: {} as Scenarios,
  setScenario: (data: Scenarios | {}) => set({ scenario: data }),
  loading: false,
  error: undefined,

  // UI 초기값
  isCreating: false,
  createDraft: { name: '', description: '' },
  selectedScenarioId: null as string | null,
  setSelectedScenarioId: (id: string | null) => set({ selectedScenarioId: id }),
  editingScenarioId: null,
  editDraft: { name: '', description: '' },
  openTooltipId: null,

  // 목록 불러오기
  async loadScenarios() {
    set({ loading: true, error: undefined });
    try {
      const qs = await getDocs(collection(db, 'scenarios'));
      const list = qs.docs.map(d => {
        const data = d.data() as any;
        return { ...data as Omit<Scenarios, 'id'>, id: d.id } as Scenarios; // 문서 ID 우선
      })
      .filter(item => !item.deletedAt);
      set({ scenarios: list, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? '시나리오 로드 실패' });
    }
  },

  // 시나리오 가져오기
  async getScenarioById(id: string) {
    const ref = doc(db, 'scenarios', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = {
        ...(snap.data() as Omit<Scenarios, 'id'>),
        id: snap.id,
      } as Scenarios;
      set({ scenario: data });
      return data;
    }
    return null;
  },

  // 등록 폼
  openCreate() {
    set({ isCreating: true, createDraft: { name: '', description: '' } });
  },
  cancelCreate() {
    set({ isCreating: false, createDraft: { name: '', description: '' } });
  },
  setCreateField(name: string, value: string) {
    set((s: any) => ({ createDraft: { ...s.createDraft, [name]: value } }));
  },
  async saveCreate(userId: string) {
    const { createDraft, scenarios } = get();
    const payload = {
      ...createDraft,
      createdBy: userId,
      createdAt: serverTimestamp(),
      lastModifiedBy: userId,
      lastModifiedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'scenarios'), payload);
    const snap = await getDoc(ref);
    const created = {
      id: ref.id,
      ...(snap.exists() ? (snap.data() as Omit<Scenarios, 'id'>) : (payload as Omit<Scenarios, 'id'>)),
    } as Scenarios;

    set({
      scenarios: [created, ...scenarios],
      isCreating: false,
      createDraft: { name: '', description: '' },
    });
    return created;
  },

  // 수정 폼
  startEdit(s: any) {
    set({
      editingScenarioId: s.id,
      editDraft: { name: s.name ?? '', description: s.description ?? '' },
    });
  },
  cancelEdit() {
    set({ editingScenarioId: null, editDraft: { name: '', description: '' } });
  },
  setEditField(name: string, value: string) {
    set((state: any) => ({ editDraft: { ...state.editDraft, [name]: value } }));
  },
  async saveEdit(userId: string) {
    const { editingScenarioId, editDraft, scenarios } = get();
    if (!editingScenarioId) return;

    const ref = doc(db, 'scenarios', editingScenarioId);
    await updateDoc(ref, {
      ...editDraft,
      lastModifiedBy: userId,
      lastModifiedAt: serverTimestamp(),
    });

    // 로컬 상태 반영(간단 머지)
    const next = scenarios.map((s: any) =>
      s.id === editingScenarioId ? { ...s, ...editDraft } as Scenarios : s
    );
    set({ scenarios: next, editingScenarioId: null, editDraft: { name: '', description: '' } });
  },

  // 소프트 삭제
  async softDeleteScenario(id: string) {
    const ref = doc(db, 'scenarios', id);
    await updateDoc(ref, { deletedAt: serverTimestamp() });
    set({ scenarios: get().scenarios.filter((s: any) => s.id !== id) });
  },
  // 하드 삭제
  async hardDeleteScenario(id: string) {
    const ref = doc(db, 'scenarios', id);
    await deleteDoc(ref);
    set({ scenarios: get().scenarios.filter((s: any) => s.id !== id) });
  },

  // tooltip 토글
  toggleTooltip(id: string) {
    set((s: any) => ({ openTooltipId: s.openTooltipId === id ? null : id }));
  },
});
