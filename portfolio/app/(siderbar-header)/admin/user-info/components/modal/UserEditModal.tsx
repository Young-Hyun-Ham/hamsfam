// app/(siderbar-header)/admin/user-info/components/modal/UserEditModal.tsx
"use client";

import type { AdminUser } from "../../types";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

type UserFormState = {
  id?: string;
  sub: string;
  name: string;
  email: string;
  provider?: string | null;
  rolesText: string; // "user,admin"
  password: string;          // <-- 추가
  passwordConfirm: string;   // <-- 추가
};

type Props = {
  isOpen: boolean;
  loading: boolean;
  isEditing: boolean;
  form: UserFormState;
  userInfo?: AdminUser | null;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
};

export default function UserEditModal({
  isOpen,
  loading,
  isEditing,
  form,
  userInfo,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          {isEditing ? "사용자 정보 수정" : "새 사용자 등록"}
        </h2>

        <form className="space-y-3" onSubmit={onSubmit}>
          {/* SUB */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">SUB (uid)</label>
            <input
              name="sub"
              value={form.sub}
              onChange={onChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs"
              placeholder="Firebase uid 또는 고유 식별자"
              disabled={isEditing} // 기존 사용자는 SUB 수정 방지
            />
          </div>

          {/* 이름 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">이름</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs"
              placeholder="이름"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">이메일</label>
            <input
              name="email"
              value={form.email}
              onChange={onChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs"
              placeholder="email@example.com"
            />
          </div>

          {/* Provider */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Provider</label>
            <select
              name="provider"
              value={form.provider ?? "google"}
              onChange={onChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs bg-white"
            >
              <option value="google">Google</option>
              <option value="firebase">Firebase</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">
              비밀번호{" "}
              {isEditing && (
                <span className="text-gray-400">
                  (비워두면 기존 비밀번호 유지)
                </span>
              )}
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs"
              placeholder={isEditing ? "변경 시에만 입력" : "비밀번호"}
              autoComplete="new-password"
            />
          </div>

          {/* Password Confirm */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">비밀번호 확인</label>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={onChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs"
              placeholder="비밀번호를 다시 입력"
              autoComplete="new-password"
            />
          </div>

          {/* Roles */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">
              Roles{" "}
              <span className="text-gray-400">(콤마로 구분, 예: user,admin)</span>
            </label>
            <input
              name="rolesText"
              value={form.rolesText}
              onChange={onChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs"
              placeholder="user,admin"
            />
          </div>

          {/* 읽기용 정보 */}
          {isEditing && userInfo && (
            <div className="mt-2 text-[11px] text-gray-500 space-y-1">
              <div>가입일: {userInfo.createdAt?.substring(0, 19)}</div>
              <div>
                마지막 접속: {userInfo.lastLoginAt?.substring(0, 19) ?? "-"}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700 bg-white hover:bg-gray-50"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
