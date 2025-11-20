
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { Menu, MenuSearchParams } from '../types/types';

const colRef = collection(db, "menu"); // 컬렉션 이름: menu

// 목록 조회
export async function fetchMenuList(
  params: MenuSearchParams = {}
): Promise<Menu[]> {
  const { searchText, lev } = params;
  const colRef = collection(db, "menu");
  // 🔹 Firestore 쿼리 조건 구성
  const constraints: any[] = [];

  // lev 필터 (1,2,3 중 하나)
  if (typeof lev === "number") {
    constraints.push(where("lev", "==", lev));
  }
  // 정렬 기준 (order 있으면 order 기준, 없으면 createdAt 등)
  constraints.push(orderBy("order", "asc"));
  const qRef = query(colRef, ...constraints);
  const snap = await getDocs(qRef);
  
  // 기본 매핑
  let items: Menu[] = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      menu_id: data.menu_id ?? "",
      label: data.label ?? "",
      href: data.href ?? null,
      order: data.order ?? null,
      lev: data.lev ?? 1,
      up_id: data.up_id ?? null,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    } as Menu;
  });

  // 🔹 전체 메뉴를 별도로 가져와서 path 구성에 사용
  const fullSnap = await getDocs(collection(db, "menu"));
  const fullList = fullSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as any[];

  // 메뉴를 빠르게 찾기 위한 map
  const menuMap = new Map(fullList.map((m) => [m.id, m]));

  // 🔹 Path 생성 함수
  function buildPath(menuId: string): string {
    const pathLabels: string[] = [];

    let current = menuMap.get(menuId);

    while (current) {
      pathLabels.push(current.label ?? "");
      if (!current.up_id) break;
      current = menuMap.get(current.up_id);
    }

    return pathLabels.reverse().join(" > ");
  }

  // 🔹 각 menu에 path 추가
  items = items.map((m) => ({
    ...m,
    path_labels: buildPath(m.id ?? ""), // path 생성
  }));

  // search(menu_id / label) 필터 (JS에서 처리)
  if (searchText && searchText.trim()) {
    const keyword = searchText.trim().toLowerCase();
    items = items.filter((m) => {
      const menuId = (m.menu_id ?? "").toLowerCase();
      const label = (m.label ?? "").toLowerCase();
      return menuId.includes(keyword) || label.includes(keyword);
    });
  }

  return items;
}

// 등록
export async function createMenu(payload: Omit<Menu, "createdAt" | "updatedAt">) {
  const docRef = doc(colRef, payload.label); // 문서ID 직접 지정!
  await setDoc(docRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // const docRef = await addDoc(colRef, {
  //   ...payload,
  //   createdAt: serverTimestamp(),
  //   updatedAt: serverTimestamp(),
  // });
  return payload.id;
}

// 수정
export async function updateMenu(
  id: string,
  payload: Partial<Omit<Menu, "id" | "createdAt" | "updatedAt">>
) {
  const ref = doc(db, "menu", id);
  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

// 삭제
export async function deleteMenuById(id: string) {
  const ref = doc(db, "menu", id);
  await deleteDoc(ref);
}