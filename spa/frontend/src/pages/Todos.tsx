// src/pages/Todos.tsx
import { useEffect, useState } from 'react'
import { listTodos, createTodo, patchTodo, deleteTodo } from '../api/todos'
import type { Todo } from '../types/todos'

export default function Todos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      setLoading(true)
      const data = await listTodos()
      setTodos(data)
      setError(null)
    } catch (e: any) {
      setError(e.message ?? '에러')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function add() {
    if (!title.trim()) return
    await createTodo(title.trim())
    setTitle('')
    refresh()
  }

  async function toggle(t: Todo) {
    await patchTodo(t.id, { done: !t.done })
    refresh()
  }

  async function rename(t: Todo) {
    const next = prompt('제목 수정', t.title)
    if (next == null) return
    await patchTodo(t.id, { title: next })
    refresh()
  }

  async function remove(id: number) {
    if (!confirm('삭제할까요?')) return
    await deleteTodo(id)
    refresh()
  }

  return (
    <div>
      <h2>Todos</h2>
      <small>API: {import.meta.env.VITE_API_BASE || 'http://localhost:8000'}</small>

      <div style={{ height: 12 }} />
      <div className="row">
        <input
          type="text"
          placeholder="할 일 입력..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn-block" onClick={add}>추가</button>
        <button className="btn-block" onClick={refresh}>새로고침</button>
      </div>

      <div style={{ height: 16 }} />
      {loading && <div>로딩중...</div>}
      {error && <div style={{ color: 'crimson' }}>에러: {error}</div>}

      {!loading && todos.map((t) => (
        <div key={t.id} className="todo">
          <div className="left">
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
            <div>
              <div style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
                {t.title}
              </div>
              <small>#{t.id} • {t.created_at}</small>
            </div>
          </div>
          <div className="right ">
            <button className="btn-block" onClick={() => rename(t)}>이름변경</button>
            <button className="btn-block" onClick={() => remove(t.id)}>삭제</button>
          </div>
        </div>
      ))}

      {!loading && todos.length === 0 && <div>항목이 없습니다.</div>}
    </div>
  )
}
