// src/api/todos.ts

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function listTodos() {
  const res = await fetch(`${API_BASE}/todos`);
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

export async function createTodo(title: string) {
  const res = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error('Failed to create');
  return res.json();
}

export async function patchTodo(id: number, data: { done?: boolean; title?: string }) {
  const params = new URLSearchParams();
  if (data.done !== undefined) params.set('done', String(data.done));
  if (data.title !== undefined) params.set('title', data.title);
  const res = await fetch(`${API_BASE}/todos/${id}?${params.toString()}`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

export async function deleteTodo(id: number) {
  const res = await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
}
