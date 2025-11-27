// src/routes/todos/todos.ts
import { writable, type Writable } from 'svelte/store';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '$lib/firebase';

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt?: any;
};

export const todos: Writable<Todo[]> = writable([]);
export const loading: Writable<boolean> = writable(false);
export const newTodoTitle: Writable<string> = writable('');

/** Firestore 컬렉션 참조 */
function todosCol() {
  const db = getDb();
  return collection(db, 'todos');
}

/** 목록 로드 */
export async function loadTodos() {
  loading.set(true);
  try {
    const snap = await getDocs(todosCol());
    const list: Todo[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      list.push({
        id: docSnap.id,
        title: data.title,
        done: data.done ?? false,
        createdAt: data.createdAt,
      });
    });
    todos.set(list);
  } catch (err) {
    console.error('loadTodos error:', err);
  } finally {
    loading.set(false);
  }
}

/** 추가 */
export async function addTodo() {
  let titleValue: string;
  newTodoTitle.update((val) => {
    titleValue = val.trim();
    return val;
  });

  // @ts-ignore
  if (!titleValue) return;

  try {
    const ref = await addDoc(todosCol(), {
      title: titleValue,
      done: false,
      createdAt: serverTimestamp(),
    });

    todos.update((list) => [
      ...list,
      { id: ref.id, title: titleValue!, done: false },
    ]);
    newTodoTitle.set('');
  } catch (err) {
    console.error('addTodo error:', err);
  }
}

/** 토글 */
export async function toggleTodo(id: string, done: boolean) {
  try {
    const db = getDb();
    const ref = doc(db, 'todos', id);
    await updateDoc(ref, { done: !done });

    todos.update((list) =>
      list.map((t) => (t.id === id ? { ...t, done: !done } : t)),
    );
  } catch (err) {
    console.error('toggleTodo error:', err);
  }
}

/** 삭제 */
export async function deleteTodo(id: string) {
  try {
    const db = getDb();
    const ref = doc(db, 'todos', id);
    await deleteDoc(ref);
    todos.update((list) => list.filter((t) => t.id !== id));
  } catch (err) {
    console.error('deleteTodo error:', err);
  }
}
