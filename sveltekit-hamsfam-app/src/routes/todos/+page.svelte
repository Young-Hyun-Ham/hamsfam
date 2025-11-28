<!-- src/routes/todos/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  import { db, auth } from '$lib/firebase';
  import {
    collection,
    query,
    orderBy,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
  } from 'firebase/firestore';
  import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    onAuthStateChanged,
    signOut,
    type User
  } from 'firebase/auth';

  import { Capacitor } from '@capacitor/core';
  import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

  type Todo = {
    id: string;
    text: string;
    done: boolean;
    createdAt: string;
    uid: string; // 작성자
  };

  let todos: Todo[] = [];
  let newText = '';

  let user: User | null = null;
  let authReady = false;

  let unsubscribeTodos: (() => void) | null = null;
  let unsubscribeAuth: (() => void) | null = null;

  function subscribeTodosForUser(u: User) {
    // 이전 구독 정리
    if (unsubscribeTodos) {
      unsubscribeTodos();
      unsubscribeTodos = null;
    }

    const q = query(
      collection(db, 'todos'),
      where('uid', '==', u.uid),
      orderBy('createdAt', 'desc')
    );

    unsubscribeTodos = onSnapshot(
      q,
      (snapshot) => {
        todos = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Todo, 'id'>;
          return {
            id: d.id,
            text: data.text,
            done: data.done,
            createdAt: data.createdAt,
            uid: data.uid
          };
        });
      },
      (error) => {
        console.error('Failed to subscribe todos:', error);
        alert('할 일 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    );
  }

  // Auth + Todos 구독
  onMount(() => {
    if (!browser) return;

    unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      authReady = true;
      user = fbUser;

      if (user) {
        subscribeTodosForUser(user);
      } else {
        if (unsubscribeTodos) {
          unsubscribeTodos();
          unsubscribeTodos = null;
        }
        todos = [];
      }
    });
  });

  onDestroy(() => {
    if (unsubscribeAuth) unsubscribeAuth();
    if (unsubscribeTodos) unsubscribeTodos();
  });

  async function loginWithGoogle() {
    try {
      if (Capacitor.isNativePlatform()) {
        // 🔹 ANDROID / iOS: Credential Manager 끄고, 예전 방식으로 Google Sign-In
        const result = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: false,
        });

        const idToken = result.credential?.idToken;

        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
        } else {
          console.warn('signInWithGoogle 결과에 idToken이 없습니다:', result);
        }
      } else {
        // 🔹 Web: 기존 팝업 방식 유지
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      console.error('Login failed (outer catch):', e);
      alert('로그인 중 오류가 발생했습니다.');
    }
  }

  async function logout() {
    try {
      if (Capacitor.isNativePlatform()) {
        // 네이티브 Firebase 인증도 로그아웃
        await FirebaseAuthentication.signOut();
      }
      await signOut(auth);
    } catch (e) {
      console.error('Logout failed:', e);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  }

  async function addTodo() {
    const text = newText.trim();
    if (!text) return;
    if (!user) {
      alert('로그인 후에 할 일을 추가할 수 있습니다.');
      return;
    }

    const now = new Date().toISOString();

    try {
      await addDoc(collection(db, 'todos'), {
        text,
        done: false,
        createdAt: now,
        uid: user.uid
      });
      newText = '';
    } catch (e) {
      console.error('Failed to add todo:', e);
      alert('할 일을 추가하는 중 오류가 발생했습니다.');
    }
  }

  async function toggleTodo(id: string) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    try {
      await updateDoc(doc(db, 'todos', id), {
        done: !target.done
      });
    } catch (e) {
      console.error('Failed to toggle todo:', e);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  }

  async function removeTodo(id: string) {
    if (!confirm('정말 삭제할까요?')) return;

    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (e) {
      console.error('Failed to delete todo:', e);
      alert('삭제 중 오류가 발생했습니다.');
    }
  }

  async function clearCompleted() {
    if (!confirm('완료된 항목을 모두 삭제할까요?')) return;

    const completed = todos.filter((t) => t.done);
    if (completed.length === 0) return;

    try {
      await Promise.all(
        completed.map((t) => deleteDoc(doc(db, 'todos', t.id)))
      );
    } catch (e) {
      console.error('Failed to clear completed todos:', e);
      alert('완료 항목 삭제 중 오류가 발생했습니다.');
    }
  }

  $: totalCount = todos.length;
  $: doneCount = todos.filter((t) => t.done).length;
</script>

<svelte:head>
  <title>할 일 관리 | Hamsfam</title>
</svelte:head>

<main class="todos-page">
  <section class="todos-card">
    <!-- 상단: 제목 + 로그인 영역 -->
    <header class="todos-header">
      <div>
        <h1>할 일 목록</h1>
        <p class="sub">오늘 해야 할 일들을 간단히 관리해요.</p>
      </div>

      <div class="header-right">
        {#if !authReady}
          <span class="auth-status">로그인 상태 확인 중...</span>
        {:else if user}
          <div class="user-box">
            <span class="user-name">
              {user.displayName || user.email || '로그인 사용자'}
            </span>
            <button type="button" class="auth-btn" on:click={logout}>
              로그아웃
            </button>
          </div>
        {:else}
          <button type="button" class="auth-btn" on:click={loginWithGoogle}>
            Google 로그인
          </button>
        {/if}
      </div>
    </header>

    {#if authReady && !user}
      <!-- 로그인 안 된 상태 -->
      <div class="login-info">
        <p>로그인 후에 나만의 할 일 목록을 관리할 수 있어요.</p>
        <button type="button" class="auth-btn wide" on:click={loginWithGoogle}>
          Google 계정으로 로그인
        </button>
      </div>
    {:else if !authReady}
      <!-- authReady 전 -->
      <p class="empty">로그인 정보를 불러오는 중입니다...</p>
    {:else}
      <!-- 로그인된 상태에서만 todo UI 노출 -->
      <form
        class="add-form"
        on:submit|preventDefault={addTodo}
      >
        <input
          type="text"
          placeholder="할 일을 입력하고 Enter를 눌러 추가하세요."
          bind:value={newText}
        />
        <button type="submit" disabled={!newText.trim()}>
          추가
        </button>
      </form>

      <div class="stats">
        <span>전체: {totalCount}</span>
        <span>완료: {doneCount}</span>
      </div>

      {#if todos.length === 0}
        <p class="empty">아직 등록된 할 일이 없어요. 위에서 하나 추가해 볼까요?</p>
      {:else}
        <ul class="todo-list">
          {#each todos as todo (todo.id)}
            <li class="todo-item">
              <label class="todo-main">
                <input
                  type="checkbox"
                  checked={todo.done}
                  on:change={() => toggleTodo(todo.id)}
                />
                <div class="todo-texts">
                  <span class:done={todo.done}>{todo.text}</span>
                  <small>
                    {#if todo.createdAt}
                      {new Date(todo.createdAt).toLocaleString()}
                    {/if}
                  </small>
                </div>
              </label>
              <button
                type="button"
                class="delete-btn"
                on:click={() => removeTodo(todo.id)}
              >
                삭제
              </button>
            </li>
          {/each}
        </ul>

        {#if doneCount > 0}
          <div class="footer-actions">
            <button type="button" on:click={clearCompleted}>
              완료된 항목 모두 삭제
            </button>
          </div>
        {/if}
      {/if}
    {/if}
  </section>
</main>

<style>
  .todos-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 1.5rem 1rem;
    background: #f5f5f5;
  }

  .todos-card {
    width: 100%;
    max-width: 640px;
    background: white;
    border-radius: 16px;
    padding: 1.5rem 1.25rem;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .todos-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .todos-header h1 {
    font-size: 1.4rem;
    margin: 0;
  }

  .sub {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: #64748b;
  }

  .header-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .auth-status {
    font-size: 0.8rem;
    color: #64748b;
  }

  .user-box {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .user-name {
    font-size: 0.85rem;
    color: #334155;
    max-width: 180px;
    text-align: right;
    word-break: break-all;
  }

  .auth-btn {
    border: none;
    background: #0f766e;
    color: white;
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
  }

  .auth-btn.wide {
    width: 100%;
    justify-content: center;
    text-align: center;
  }

  .login-info {
    margin-top: 0.5rem;
    padding: 1rem;
    border-radius: 12px;
    background: #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: #475569;
  }

  .stats {
    font-size: 0.85rem;
    color: #475569;
    display: flex;
    gap: 0.75rem;
    white-space: nowrap;
  }

  .add-form {
    display: flex;
    gap: 0.5rem;
  }

  .add-form input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    font-size: 0.95rem;
    outline: none;
  }

  .add-form input:focus {
    border-color: #0f766e;
    box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.2);
  }

  .add-form button {
    padding: 0.6rem 1.2rem;
    border-radius: 999px;
    border: none;
    font-size: 0.9rem;
    font-weight: 600;
    background: #0f766e;
    color: white;
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.05s ease;
  }

  .add-form button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .add-form button:not(:disabled):active {
    transform: translateY(1px);
  }

  .empty {
    text-align: center;
    font-size: 0.9rem;
    color: #94a3b8;
    padding: 1.5rem 0.5rem;
  }

  .todo-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    background: #f8fafc;
  }

  .todo-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    cursor: pointer;
  }

  .todo-main input[type='checkbox'] {
    width: 16px;
    height: 16px;
  }

  .todo-texts {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .todo-texts span {
    font-size: 0.95rem;
  }

  .todo-texts span.done {
    text-decoration: line-through;
    color: #9ca3af;
  }

  .todo-texts small {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .delete-btn {
    border: none;
    background: transparent;
    color: #ef4444;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.25rem 0.4rem;
  }

  .footer-actions {
    margin-top: 0.5rem;
    display: flex;
    justify-content: flex-end;
  }

  .footer-actions button {
    border: none;
    background: transparent;
    font-size: 0.8rem;
    color: #64748b;
    cursor: pointer;
    padding: 0.25rem 0.4rem;
  }

  @media (max-width: 480px) {
    .todos-card {
      padding: 1.25rem 1rem;
    }

    .todos-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .add-form {
      flex-direction: column;
    }

    .add-form button {
      width: 100%;
    }

    .header-right {
      width: 100%;
      justify-content: flex-start;
    }

    .user-box {
      align-items: flex-start;
    }
  }
</style>
