// app/(sidebar-header)/admin/chatbot-shortcut-menu/dto/firebaseApi.ts
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShortcutMenu, ShortcutMenuSearchParams } from "../types/types";

const COLLECTION = "chatbot-shortcut-menus";

// 👇 목록 조회할 때 id 필드 덮어쓰지 않게 주의
export async function fetchShortcutMenuListFromFirebase(
  params: ShortcutMenuSearchParams = {},
): Promise<ShortcutMenu[]> {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy("order", "asc"));
  const snap = await getDocs(q);

  let list: ShortcutMenu[] = snap.docs.map((d) => {
    const data = d.data() as ShortcutMenu;
    // data 안에 id 필드가 있어도 Firestore의 문서 id로 강제 통일
    const { id: _ignored, ...rest } = data;
    return { id: d.id, ...rest };
  });

  if (params.searchText) {
    const keyword = params.searchText.toLowerCase();
    list = list.filter((item) =>
      [item.section, item.label, item.scenarioKey ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  return list;
}

// 🔥 여기 중요: addDoc 대신 setDoc 사용해서 id를 직접 경로로 씀
export async function createShortcutMenuOnFirebase(
  data: ShortcutMenu,
): Promise<string> {
  const colRef = collection(db, COLLECTION);
  const now = new Date().toISOString();

  // 프론트에서 uuid를 만들어놨다면 그걸 쓰고,
  // 없다면 여기서 새로 생성
  const id = data.id ?? doc(colRef).id;

  const docRef = doc(colRef, id);
  const payload = {
    ...data,
    id, // 문서 안에도 동일 id 저장
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, payload);
  return id;
}

export async function updateShortcutMenuOnFirebase(
  id: string,
  data: ShortcutMenu,
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  const now = new Date().toISOString();

  await updateDoc(docRef, {
    ...data,
    updatedAt: now,
  } as any);
}

export async function deleteShortcutMenuOnFirebase(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}
