'use client';

import { ChevronDown, X } from 'lucide-react';
import { FormState, Menu } from '../../types/types';

type Props = {
  isOpen: boolean;
  isEditing: boolean;
  form: FormState;
  parentOptions: Menu[];
  loading: boolean;
  onClose: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function MenuModal({
  isOpen,
  isEditing,
  form,
  parentOptions,
  loading,
  onClose,
  onChange,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-800">
            {isEditing ? '메뉴 수정' : '새 메뉴 등록'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="px-4 py-4 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Menu ID *</label>
              <input
                name="menu_id"
                value={form.menu_id}
                onChange={onChange}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="예: admin.menu"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Label *</label>
              <input
                name="label"
                value={form.label}
                onChange={onChange}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="메뉴명"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Href</label>
              <input
                name="href"
                value={form.href}
                onChange={onChange}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="/admin/menus"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Order</label>
              <input
                name="order"
                value={form.order}
                onChange={onChange}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="정렬순서"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Level *</label>
              <div className="relative">
                <select
                  className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
                  name="lev"
                  value={form.lev}
                  onChange={onChange}
                >
                  <option value="1">1 (해더메뉴)</option>
                  <option value="2">2 (대메뉴)</option>
                  <option value="3">3 (중메뉴)</option>
                  <option value="4">4 (소메뉴)</option>
                </select>

                {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>

            {/* PATH */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">PATH</label>

              {Number(form.lev) === 1 ? (
                <input
                  value="상위 메뉴 없음 (1레벨)"
                  disabled
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-400"
                />
              ) : (
                <div className="relative">
                  <select
                    className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
                    name="up_id"
                    value={form.up_id ?? ''}
                    onChange={onChange}
                  >
                    <option value="">상위 메뉴 선택</option>
                    {parentOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isEditing ? '수정하기' : '등록하기'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
