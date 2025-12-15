// app/(siderbar-header)/admin/menu/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Search, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { useStore } from "@/store";

import useMenuStore from './store';
import { FormState, Menu } from './types/types';
import MenuModal from './components/modal/MenuModal';
import { NavItem, SidebarMenu } from '@/types/nav';

const initialForm: FormState = {
  menu_id: '',
  label: '',
  href: '',
  order: '',
  lev: '1',
  up_id: '',
  use_yn: 'Y',
};

const PAGE_SIZE = 12; // 🔹 한 페이지에 10개씩

export default function MenuManagement() {
  const [copyMenus, setCopyMenus] = useState<Menu[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [levFilter, setLevFilter] = useState<number | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);

  // 모달 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const {
    fetchMenuList,
    createMenu,
    updateMenu,
    deleteMenuById,
  } = useMenuStore();

  const {
    headerMenus,
    setHeaderMMenus,
    sidebarMenus,
    setSidebarMenus,
  } = useStore();

  // 최초 로드
  useEffect(() => {
    const onload = async () => {
      try {
        setLoading(true);
        const data = await fetchMenuList({});
        setMenus(data);
        setCurrentPage(1);
        setCopyMenus(data); // 초기에 한번 전체 데이터 카피
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? '메뉴 로드 실패');
      } finally {
        setLoading(false);
      }
    };

    onload();
  }, [fetchMenuList]);

  // 현재 페이지 기준 slice
  const totalItems = menus.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedMenus = menus.slice(pageStart, pageEnd);

  const pageReload = async (params: {searchText?: string, lev?:  number | null, isheader?: boolean}) => {
    const data = await fetchMenuList(params);
    setMenus(data);
    setCurrentPage(1);
    if (!(params.isheader ?? false)) return;

    // 가져온 데이터로 글로벌 menu store 수정
    const allMenuData = await fetchMenuList({});
    const navItems: NavItem[] = allMenuData.filter(d => d.lev === 1)
                                            .filter(d => (d.use_yn ?? 'Y') === 'Y')
                                            .map((d: Menu) => ({
                                              id: d.id ?? '',
                                              label: d.label,
                                              href: d.href ?? '',
                                              order: d.order ?? undefined,
                                              use_yn: d.use_yn ?? 'Y',
                                            }));
    setHeaderMMenus(navItems);

    const sidebarMenus: SidebarMenu[] = allMenuData.filter(d => d.lev !== 1)
                                                    .filter(d => (d.use_yn ?? 'Y') === 'Y')
                                                    .map((d: Menu) => ({
                                                      id: d.id ?? '',
                                                      label: d.label,
                                                      href: d.href ?? '',
                                                      order: d.order ?? undefined,
                                                      lev: d.lev,
                                                      up_id: d.up_id ?? '',
                                                      depth: d.depth,
                                                      path_ids: d.path_ids ?? '',
                                                      path_labels: d.path_labels ?? '',
                                                      use_yn: d.use_yn ?? 'Y',
                                                    }));
    setSidebarMenus(sidebarMenus);
  }

  // 페이지 이동
  const goToPage = (page: number) => {
    const newPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(newPage);
  };

  // 폼 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // setForm(prev => ({ ...prev, [name]: value }));
    setForm(prev => {
      const next: FormState = { ...prev, [name]: value };
      // 현재 레벨 숫자
      const currentLev = Number(name === 'lev' ? value : prev.lev || '1');

      // PATH(up_id)나 menu_id가 바뀌면 href 자동 생성
      if (!isEditing && (name === 'up_id' || name === 'menu_id')) {
        // 이번에 변경된 값 기준으로 upId / menuId 결정
        const upId = name === 'up_id' ? value : prev.up_id;
        const menuId = name === 'menu_id' ? value : prev.menu_id;

        if (upId) {
          // 부모 menu_id 계층 추적
          const menuPath = buildMenuPathByMenuId(upId);
          let href = '/' + menuPath.join('/');

          // menu_id가 있으면 현재 메뉴의 menu_id 추가
          if (menuId) { href += `/${menuId}`; }

          next.href = href;
        }
      }

      // PATH(up_id) 선택 시: 해당 레벨의 형제들 중 최대 order + 1 자동 세팅
      if (name === 'up_id') {
        const upId = value;

        // 같은 레벨(currentLev) + 같은 부모(up_id)의 형제들
        const siblings = copyMenus.filter(
          (m) => m.lev === currentLev && m.up_id === upId
        );

        if (siblings.length > 0) {
          const maxOrder = siblings.reduce((max, m) => {
            const o = m.order ?? 0;
            return o > max ? o : max;
          }, 0);

          next.order = String(maxOrder + 1);
        } else {
          // 형제가 하나도 없으면 1로 시작
          next.order = '1';
        }
      }

      return next;
    });
  };

  // menu_id 기반으로 전체 경로를 추적하는 함수
  // id(=menu.id) 기준으로 상위 메뉴들을 타고 올라가며 menu_id 경로 배열 생성
  const buildMenuPathByMenuId = (id: string | null | undefined): string[] => {
    if (!id) return [];

    const menu = copyMenus.find(m => m.id === id);
    if (!menu) return [];

    if (menu.up_id) {
      return [...buildMenuPathByMenuId(menu.up_id), menu.menu_id];
    }

    // 최상위
    return [menu.menu_id];
  };

  // 모달 열기 - 신규
  const handleOpenCreate = () => {
    setIsEditing(false);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  // 모달 열기 - 수정
  const handleOpenEdit = (menu: Menu) => {
    setIsEditing(true);
    setForm({
      id: menu.id,
      menu_id: menu.menu_id,
      label: menu.label,
      href: menu.href ?? '',
      order: menu.order?.toString() ?? '',
      lev: menu.lev.toString(),
      up_id: menu.up_id ?? '',
      use_yn: menu.use_yn ?? "Y",
    });
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setForm(initialForm);
    setIsEditing(false);
  };

  // 삭제
  const handleDelete = async (menu: Menu) => {
    if (!confirm(`메뉴 "${menu.label}" 을(를) 삭제할까요?`)) return;

    try {
      if (!menu.id) {
        alert("삭제할 수 없습니다.")
        return;
      }
      
      setLoading(true);
      setError(null);
      await deleteMenuById(menu.id ?? "");
      // 삭제 후 목록 다시 로드 + 페이지 1로 이동
      pageReload({ searchText, lev: levFilter, isheader: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? '메뉴 삭제 실패');
    } finally {
      setLoading(false);
    }
  };

  // 폼 제출 (모달 내부) - 생성/수정 공용
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const payload = {
        menu_id: form.menu_id.trim(),
        label: form.label.trim(),
        href: form.href.trim() || null,
        order: form.order ? Number(form.order) : null,
        lev: Number(form.lev),
        up_id: form.up_id.trim() || null,
        use_yn: form.use_yn ?? "Y",
      } as Menu;

      if (!payload.menu_id || !payload.label || !payload.lev) {
        alert('menu_id, label, lev는 필수입니다.');
        return;
      }

      if (isEditing && form.id) {
        await updateMenu(form.id, payload);
        alert("수정 되었습니다.");
      } else {
        payload.id = uuidv4();
        const refId = await createMenu(payload);
        if (refId) {
          alert("등록 되었습니다.");
        }
      }

      // 저장 후 목록 새로고침 + 페이지 1로 이동
      pageReload({ searchText, lev: levFilter, isheader: true });
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  // 검색 & 리프레시
  const handleSearch = async () => {
    try {
      setLoading(true);
      pageReload({ searchText, lev: levFilter });
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? '검색 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setSearchText('');
      setLevFilter(null);
      pageReload({});
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? '새로고침 실패');
    } finally {
      setLoading(false);
    }
  };

  // 현재 선택된 레벨에 따른 부모 (lev-1)
  const currentLev = Number(form.lev || '1');
  const parentLevel = currentLev - 1;

  const parentOptions =
    parentLevel >= 1
      ? copyMenus.filter((m) => m.lev === parentLevel)
      : [];

  return (
    <div className="p-6 bg-gray-50 h-full font-sans">
      {/* Breadcrumb Navigation */}
      <div className="text-sm text-gray-500 mb-4">
        Admin
        <span className="mx-1"> / </span>
        <span className="text-gray-800 font-semibold">메뉴관리</span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        {/* 상단 타이틀 + 등록 버튼 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">메뉴 목록</h1>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            + 새 메뉴 등록
          </button>
        </div>

        {/* 필터 & 검색 영역 */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
          {/* Level Filter */}
          <div className="flex flex-col w-full md:w-40">
            <label className="text-xs font-medium text-gray-600 mb-1">Level Filter</label>
            <div className="relative">
              <select
                className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm w-full bg-white"
                value={levFilter ?? ""}
                onChange={async (e) => {
                  const val = e.target.value;
                  const lev = val ? Number(val) : null;
                  setLevFilter(lev);
                }}
              >
                <option value="">All</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>

              {/* 커스텀 화살표: 텍스트 왼쪽 padding과 동일한 간격(12px) */}
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>

          {/* Search 입력 + 버튼 */}
          <div className="flex flex-1 flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">
              Search (menu_id / label)
            </label>
            <div className="flex">
              <input
                type="text"
                className="border border-gray-300 rounded-l-md px-3 py-2 text-sm w-full"
                placeholder="검색어를 입력하세요"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <button
                type="button"
                className="p-2 border-y border-r border-gray-300 text-gray-500 hover:bg-gray-100"
                onClick={handleRefresh}
              >
                <RefreshCw size={18} />
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-6 py-2 rounded-r-md font-semibold text-sm hover:bg-blue-700 flex items-center gap-1"
                onClick={handleSearch}
              >
                <Search size={16} />
                SEARCH
              </button>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                  Menu ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                  Label
                </th>
                {/* Href 폭 줄이기 */}
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-56">
                  Href
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">
                  Order
                </th>
                {/* Parent ID 폭 줄이기 */}
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Parent ID
                </th>
                {/* Use */}
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-6">
                  Used
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                  {/* 액션 영역 */}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagedMenus.map(menu => (
                <tr
                  key={menu.id}
                  className="hover:bg-gray-50 relative cursor-pointer"
                  onClick={() => {
                    setSelectedRowId(prev => (prev === menu.id ? null : menu.id ?? ""));
                  }}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {menu.menu_id}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                    {menu.label}
                  </td>
                  {/* Href: 폭 제한 + ... + hover 시 전체 보기 */}
                  <td className="px-4 py-2 text-gray-800">
                    <span
                      className="block max-w-[220px] truncate"
                      title={menu.href ?? ""}
                    >
                      {menu.href ?? ""}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800 text-center">
                    {menu.lev}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-800 text-center">
                    {menu.order ?? ''}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    <span
                      className="block w-full truncate"
                      title={menu.path_labels ?? ''}
                    >
                      {menu.path_labels ?? ''}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-center">
                    {menu.use_yn}
                  </td>
                  {/* 이 셀은 기본 내용 없음 (오버레이 전용 공간 느낌으로 둠) */}
                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                    {/* 비워두거나, 아이콘 등 넣고 싶으면 여기에 */}
                  </td>

                  {/* 선택된 행일 때만 전체 레이어 + 우측 버튼 노출 */}
                  {selectedRowId === menu.id && (
                    <td className="absolute inset-0 bg-white/70">
                      <div className="w-full h-full flex items-center justify-end gap-2 pr-4">
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-gray-300 text-gray-700 bg-white/90 hover:bg-gray-100 text-xs"
                          onClick={(e) => {
                            e.stopPropagation(); // 행 클릭 토글 방지
                            handleOpenEdit(menu);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-red-300 text-red-600 bg-white/90 hover:bg-red-50 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(menu);
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
                    colSpan={9}
                    className="px-4 py-6 text-center text-gray-400 text-sm"
                  >
                    메뉴가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 바 */}
        {menus.length > 0 && (
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <div>
              총 {totalItems}건 중{' '}
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
          <div className="text-xs text-gray-500 mt-1">
            Loading...
          </div>
        )}
      </div>

      {/* ---------------- 모달 영역 ---------------- */}
      {isModalOpen && (
        <MenuModal
          isOpen={isModalOpen}
          isEditing={isEditing}
          form={form}
          parentOptions={parentOptions}
          loading={loading}
          onClose={handleCloseModal}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
