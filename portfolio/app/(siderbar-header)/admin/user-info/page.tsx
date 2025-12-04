// app/(siderbar-header)/admin/user-info/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import useUserStore from "./store";
import UserEditModal from "./components/modal/UserEditModal";
import type { AdminUser } from "./types";
import { ChevronDown } from "lucide-react";

const providerLabel: Record<string, string> = {
  google: "Google",
  firebase: "Firebase",
  custom: "Custom",
};

const PAGE_SIZE = 10;

type UserFormState = {
  id?: string;
  sub: string;
  name: string;
  email: string;
  provider?: string | null;
  rolesText: string;
  password: string;
  passwordConfirm: string;
};

export default function AdminUserInfoPage() {
  const fetchUserList = useUserStore((s) => s.fetchUserList);
  const upsertUser = useUserStore((s) => s.upsertUser);
  const deleteUser = useUserStore((s) => s.deleteUser);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowSub, setSelectedRowSub] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [form, setForm] = useState<UserFormState>({
    sub: "",
    name: "",
    email: "",
    provider: "google",
    rolesText: "user",
    password: "",
    passwordConfirm: "",
  });

  /* ========== 데이터 로드 ========== */
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserList({});
      setUsers(data);
      setCurrentPage(1);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "사용자 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [fetchUserList]);

  /* ========== 필터링 ========== */
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (providerFilter !== "all" && (u.provider ?? "custom") !== providerFilter) {
        return false;
      }
      if (!searchText.trim()) return true;

      const k = searchText.toLowerCase();
      return (
        (u.name ?? "").toLowerCase().includes(k) ||
        (u.email ?? "").toLowerCase().includes(k) ||
        (u.sub ?? "").toLowerCase().includes(k)
      );
    });
  }, [users, providerFilter, searchText]);

  /* ========== 페이징 ========== */
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedUsers = filtered.slice(pageStart, pageEnd);

  const goToPage = (page: number) => {
    const newPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(newPage);
  };

  /* ========== 모달 관련 ========== */
  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setForm({
      id: undefined,
      sub: "",
      name: "",
      email: "",
      provider: "google",
      rolesText: "user",
      password: "",
      passwordConfirm: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AdminUser) => {
    setIsEditing(true);
    setSelectedUser(user);
    setForm({
      id: user.id,
      sub: user.sub,
      name: user.name ?? "",
      email: user.email ?? "",
      provider: user.provider ?? "google",
      rolesText: (user.roles ?? []).join(","),
      password: "",
      passwordConfirm: "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedUser(null);
  };

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.sub.trim()) {
      alert("SUB(uid)는 필수입니다.");
      return;
    }

    // 비밀번호 검증 로직
    const hasPasswordInput =
      form.password.trim().length > 0 || form.passwordConfirm.trim().length > 0;

    if (hasPasswordInput) {
      if (form.password.trim().length < 8) {
        alert("비밀번호는 8자 이상이어야 합니다.");
        return;
      }
      if (form.password !== form.passwordConfirm) {
        alert("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const roles = form.rolesText
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const passwordToSend = hasPasswordInput ? form.password.trim() : undefined;

      await upsertUser({
        id: form.id,
        sub: form.sub.trim(),
        name: form.name.trim() || null,
        email: form.email.trim() || null,
        avatarUrl: null,
        roles,
        provider: form.provider ?? null,
        password: passwordToSend,
      });

      alert("저장되었습니다.");
      handleCloseModal();
      await loadUsers();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "저장 실패");
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* ========== 삭제 ========== */
  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`"${u.name ?? u.sub}" 사용자를 삭제할까요?`)) return;

    try {
      setLoading(true);
      setError(null);
      await deleteUser(u.sub);
      alert("삭제되었습니다.");
      await loadUsers();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "삭제 실패");
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* ========== 렌더링 ========== */
  // const firebaseCount = filtered.filter((u) => u.backend === "firebase").length;
  // const postgresCount = filtered.filter((u) => u.backend === "postgres").length;

  return (
    <div className="p-6 bg-gray-50 h-full font-sans">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        Admin
        <span className="mx-1"> / </span>
        <span className="text-gray-800 font-semibold">사용자 정보</span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        {/* 상단 타이틀 + 등록 버튼 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">사용자 목록</h1>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            + 새 사용자 등록
          </button>
        </div>

        {/* 필터 & 검색 영역 (메뉴 화면 스타일 맞춤) */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
          {/* Provider Filter */}
          <div className="flex flex-col w-full md:w-40">
            <label className="text-xs font-medium text-gray-600 mb-1">
              Provider
            </label>
            <div className="relative">
              <select
                className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="google">Google</option>
                <option value="firebase">Firebase</option>
                <option value="custom">Custom</option>
              </select>
              {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>

          {/* Search 입력 */}
          <div className="flex flex-1 flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">
              Search (이름 / 이메일 / SUB)
            </label>
            <div className="flex">
              <input
                type="text"
                className="border border-gray-300 rounded-l-md px-3 py-2 text-sm w-full"
                placeholder="검색어를 입력하세요"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
              <button
                type="button"
                className="bg-blue-600 text-white px-6 py-2 rounded-r-md font-semibold text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                SEARCH
              </button>
            </div>
          </div>
        </div>

        {/* 데이터 요약 */}
        <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
          <div>
            총 <span className="font-semibold text-gray-800">{filtered.length}</span> 명
          </div>
          <div className="flex gap-3">
            <span>{filtered.length} 명</span>
          </div>
        </div>

        {/* 데이터 테이블 (메뉴 스타일 동일) */}
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-56">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                  Roles
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                  마지막 로그인
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  SUB
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                  {/* actions */}
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {pagedUsers.map((user, idx) => (
                <tr
                  key={user.sub}
                  className="hover:bg-gray-50 relative cursor-pointer"
                  onClick={() =>
                    setSelectedRowSub((prev) => (prev === user.sub ? null : user.sub))
                  }
                >
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {pageStart + idx + 1}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {user.name ?? "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {user.email ?? "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                      {providerLabel[user.provider ?? "custom"] ?? user.provider}
                    </span>
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {user.roles?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {user.lastLoginAt?.substring(0, 19) ?? "-"}
                  </td>

                  <td className="px-4 py-2 text-gray-400">
                    <span className="block w-full truncate" title={user.sub}>
                      {user.sub}
                    </span>
                  </td>

                  {/* 기본 액션 셀 (비워둠) */}
                  <td className="px-4 py-2 whitespace-nowrap text-xs" />

                  {/* 선택된 행일 때 오버레이 + 버튼 (메뉴 화면과 동일 패턴) */}
                  {selectedRowSub === user.sub && (
                    <td className="absolute inset-0 bg-white/70">
                      <div className="w-full h-full flex items-center justify-end gap-2 pr-4">
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-gray-300 text-gray-700 bg-white/90 hover:bg-gray-100 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(user);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-red-300 text-red-600 bg-white/90 hover:bg-red-50 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(user);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-gray-400 text-sm"
                  >
                    사용자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 바 (메뉴와 동일 스타일) */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <div>
              총 {totalItems}건 중{" "}
              {totalItems === 0
                ? 0
                : `${pageStart + 1} - ${Math.min(pageEnd, totalItems)}건`}
              표시
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                처음
              </button>
              <button
                type="button"
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                이전
              </button>
              <span className="px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                다음
              </button>
              <button
                type="button"
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                마지막
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 mt-2">
            {error}
          </p>
        )}
        {loading && (
          <div className="text-xs text-gray-500 mt-1">Loading...</div>
        )}
      </div>

      {/* 모달 */}
      <UserEditModal
        isOpen={isModalOpen}
        isEditing={isEditing}
        loading={loading}
        form={form}
        userInfo={selectedUser}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        onClose={handleCloseModal}
      />
    </div>
  );
}
