// app/(sidebar-header)/admin/chatbot-shortcut-menu/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw, Search } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import useShortcutMenuStore from "./store";
import { FormState, ShortcutMenu, ShortcutGroup } from "./types/types";
import ShortcutMenuModal from "./components/modal/ShortcutMenuModal";

const initialForm: FormState = {
  id: undefined,
  group: "PROCESS_EXECUTION",
  section: "",
  label: "",
  description: "",
  scenarioKey: "",
  order: "1",
};

const PAGE_SIZE = 12;

const groupLabelMap: Record<ShortcutGroup, string> = {
  PROCESS_EXECUTION: "Process Execution",
  SEARCH: "Search",
  EXECUTION: "Execution",
};

export default function ChatbotShortcutMenuPage() {
  const [menus, setMenus] = useState<ShortcutMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [groupFilter, setGroupFilter] = useState<ShortcutGroup | "">("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const {
    fetchShortcutMenuList, 
    createShortcutMenu, 
    updateShortcutMenu, 
    deleteShortcutMenuById 
  } = useShortcutMenuStore();

  // 최초 로드
  useEffect(() => {
    const onload = async () => {
      try {
        setLoading(true);
        const data = await fetchShortcutMenuList({});
        setMenus(data);
        setCurrentPage(1);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "바로가기 메뉴 로드 실패");
      } finally {
        setLoading(false);
      }
    };
    onload();
  }, [fetchShortcutMenuList]);

  // 페이지네이션
  const totalItems = menus.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedMenus = menus.slice(pageStart, pageEnd);

  const goToPage = (page: number) => {
    const newPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(newPage);
  };

  const pageReload = async (params: {
    searchText?: string;
    group?: ShortcutGroup | "";
  }) => {
    const data = await fetchShortcutMenuList(params);
    setMenus(data);
    setCurrentPage(1);
  };

  // 입력 핸들러
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 신규 등록 모달 열기
  const handleOpenCreate = () => {
    setIsEditing(false);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  // 수정 모달 열기
  const handleOpenEdit = (item: ShortcutMenu) => {
    setIsEditing(true);
    setForm({
      id: item.id,
      group: item.group,
      section: item.section,
      label: item.label,
      description: item.description ?? "",
      scenarioKey: item.scenarioKey ?? "",
      order: (item.order ?? 1).toString(),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setForm(initialForm);
    setIsEditing(false);
  };

  // 삭제
  const handleDelete = async (item: ShortcutMenu) => {
    if (!item.id) {
      alert("삭제할 수 없습니다.");
      return;
    }
    if (!confirm(`"${item.label}" 바로가기 메뉴를 삭제할까요?`)) return;

    try {
      setLoading(true);
      setError(null);
      await deleteShortcutMenuById(item.id);
      await pageReload({ searchText, group: groupFilter });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  // 저장 (생성/수정 공용)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ShortcutMenu = {
      id: form.id,
      group: form.group,
      section: form.section.trim(),
      label: form.label.trim(),
      description: form.description?.trim() || null,
      scenarioKey: form.scenarioKey?.trim() || null,
      order: form.order ? Number(form.order) : null,
    };

    if (!payload.section || !payload.label) {
      alert("섹션과 라벨은 필수입니다.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEditing && form.id) {
        await updateShortcutMenu(form.id, payload);
        alert("수정되었습니다.");
      } else {
        payload.id = uuidv4();
        const refId = await createShortcutMenu(payload);
        if (refId) {
          alert("등록되었습니다.");
        }
      }

      await pageReload({ searchText, group: groupFilter });
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  // 검색 & 리프레시
  const handleSearch = async () => {
    try {
      setLoading(true);
      await pageReload({ searchText, group: groupFilter });
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "검색 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setSearchText("");
      setGroupFilter("");
      await pageReload({});
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "새로고침 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-gray-50 p-6 font-sans">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-gray-500">
        Admin
        <span className="mx-1"> / </span>
        <span className="font-semibold text-gray-800">
          Chatbot Shortcut 메뉴 관리
        </span>
      </div>

      <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
        {/* 상단 타이틀 + 등록 버튼 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">
            Chatbot Shortcut 메뉴 목록
          </h1>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + 새 바로가기 등록
          </button>
        </div>

        {/* 필터 & 검색 영역 */}
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
          {/* Group Filter */}
          <div className="flex w-full flex-col md:w-52">
            <label className="mb-1 text-xs font-medium text-gray-600">
              1레벨 그룹 필터
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm"
                value={groupFilter}
                onChange={(e) =>
                  setGroupFilter(e.target.value as ShortcutGroup | "")
                }
              >
                <option value="">All</option>
                <option value="PROCESS_EXECUTION">Process Execution</option>
                <option value="SEARCH">Search</option>
                <option value="EXECUTION">Execution</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-1 flex-col">
            <label className="mb-1 text-xs font-medium text-gray-600">
              Search (섹션 / 라벨 / 시나리오 키)
            </label>
            <div className="flex">
              <input
                type="text"
                className="w-full rounded-l-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="검색어를 입력하세요"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <button
                type="button"
                className="border-y border-r border-gray-300 p-2 text-gray-500 hover:bg-gray-100"
                onClick={handleRefresh}
              >
                <RefreshCw size={18} />
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-r-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={handleSearch}
              >
                <Search size={16} />
                SEARCH
              </button>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="table-fixed min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-32 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Group
                </th>
                <th className="w-40 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Section
                </th>
                <th className="w-40 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Label
                </th>
                <th className="w-40 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Scenario Key
                </th>
                <th className="w-16 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                  Order
                </th>
                {/* Description 은 남는 폭 전체 사용 */}
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="w-24 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                  {/* Actions */}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {pagedMenus.map((item) => (
                <tr
                  key={item.id}
                  className="relative cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setSelectedRowId((prev) =>
                      prev === item.id ? null : item.id ?? ""
                    )
                  }
                >
                  <td className="whitespace-nowrap px-4 py-2 text-gray-800">
                    {groupLabelMap[item.group]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-800">
                    {item.section}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-800">
                    {item.label}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    <span
                      className="block w-full truncate"
                      title={item.scenarioKey ?? ""}
                    >
                      {item.scenarioKey ?? ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-center text-gray-800">
                    {item.order ?? ""}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    <span
                      className="block w-full truncate"
                      title={item.description ?? ""}
                    >
                      {item.description ?? ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs">
                    {/* 오버레이 전용 */}
                  </td>

                  {selectedRowId === item.id && (
                    <td className="absolute inset-0 bg-white/70">
                      <div className="flex h-full w-full items-center justify-end gap-2 pr-4">
                        <button
                          type="button"
                          className="rounded border border-gray-300 bg-white/90 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(item);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-300 bg-white/90 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {menus.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-gray-400"
                  >
                    등록된 바로가기 메뉴가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {menus.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
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
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                처음
              </button>
              <button
                type="button"
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
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
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                다음
              </button>
              <button
                type="button"
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                마지막
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-500">
            {error}
          </p>
        )}
        {loading && (
          <div className="mt-1 text-xs text-gray-500">
            Loading...
          </div>
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <ShortcutMenuModal
          isOpen={isModalOpen}
          isEditing={isEditing}
          form={form}
          loading={loading}
          onClose={handleCloseModal}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
