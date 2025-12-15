// app/(siderbar-header)/admin/token-manage/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AdminTokenUser } from "./types";
import useUserTokenStore from "./store";
import TokenChargeModal from "./components/modal/TokenChargeModal";
import TokenHistoryModal from "./components/modal/TokenHistoryModal";
import { formatNumber } from "./utils";

const PAGE_SIZE = 10;

export default function AdminUserTokenPage() {
  // TODO: 실제 구현 시 store / service 로 교체
  const {
    fetchUserList,
  } = useUserTokenStore();
  const [users, setUsers] = useState<AdminTokenUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("user");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowSub, setSelectedRowSub] = useState<string | null>(null);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTargetUser, setModalTargetUser] = useState<AdminTokenUser | null>(
    null,
  );

  /* ========== 데이터 로드 ========== */
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // 실제 구현 예시:
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========== 필터링 ========== */
  const filtered = useMemo(() => {
    return users.filter((u) => {
      // Provider 필터는 일단 "사용자" 고정이므로 로직은 패스
      if (!searchText.trim()) return true;

      const k = searchText.toLowerCase();
      return (
        (u.name ?? "").toLowerCase().includes(k) ||
        (u.email ?? "").toLowerCase().includes(k) ||
        (u.sub ?? "").toLowerCase().includes(k)
      );
    });
  }, [users, searchText]);

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

  /* ========== 모달 열기/닫기 ========== */
  // 상단 "+ 토큰 충전" 버튼 → 사용자 미선택 상태로 모달 오픈
  const handleOpenCreate = () => {
    setModalTargetUser(null);
    setIsModalOpen(true);
  };

  // 행의 Edit 버튼 → 해당 사용자로 모달 오픈
  const handleOpenEdit = (user: AdminTokenUser) => {
    setModalTargetUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalTargetUser(null);
  };

  // 모달에서 "충전" 완료 시 호출될 콜백
  const handleTokenCharged = async () => {
    // TODO: 실제 충전 API 호출 후 목록 다시 로드
    // await loadUsers();
    await loadUsers();
  };

  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<AdminTokenUser | null>(null);

  const openHistoryModal = (user: AdminTokenUser) => {
    setHistoryUser(user);
    setHistoryOpen(true);
  };

  /* ========== 렌더링 ========== */

  return (
    <div className="p-6 bg-gray-50 h-full font-sans">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        Admin
        <span className="mx-1"> / </span>
        <span className="text-gray-800 font-semibold">토큰관리</span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        {/* 상단 타이틀 + 토큰 충전 버튼 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">사용자 목록</h1>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            + 토큰 충전
          </button>
        </div>

        {/* 필터 & 검색 영역 */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
          {/* Provider Filter (지금은 '사용자' 단일 옵션) */}
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
                <option value="user">사용자</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>

          {/* Search 입력 */}
          <div className="flex flex-1 flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">
              Search (사용자ID / 사용자명)
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
            총{" "}
            <span className="font-semibold text-gray-800">
              {filtered.length}
            </span>{" "}
            명
          </div>
          <div className="flex gap-3">
            <span>{filtered.length} 명</span>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-30">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                  총토큰
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                  사용한토큰
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                  잔여토큰
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
                    setSelectedRowSub((prev) =>
                      prev === user.sub ? null : user.sub,
                    )
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

                  {/* 총토큰 */}
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {formatNumber(user.totalToken)}
                  </td>

                  {/* 사용한토큰 */}
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {formatNumber(user.usedToken)}
                  </td>

                  {/* 잔여토큰 */}
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {formatNumber(user.remainToken)}
                  </td>

                  {/* 선택된 행일 때 Edit 버튼 오버레이 */}
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
                          충전
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-gray-300 text-gray-700 bg-white/90 hover:bg-gray-100 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            openHistoryModal(user);
                          }}
                        >
                          내역
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-400 text-sm"
                  >
                    사용자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
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

      {/* 토큰 충전 모달 */}
      <TokenChargeModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onCharged={handleTokenCharged}
        users={users}
        targetUser={modalTargetUser}
      />

      {/* 토큰 충전 내역 */}
      <TokenHistoryModal
        open={isHistoryOpen}
        onClose={() => setHistoryOpen(false)}
        user={historyUser}
      />
    </div>
  );
}
