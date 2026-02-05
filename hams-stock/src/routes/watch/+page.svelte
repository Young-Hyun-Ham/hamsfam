<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import { user } from "$lib/stores/user";
  import { db } from "$lib/firebase/client";
  import { upsertWatchTarget, setWatchTargetEnabled, removeWatchTarget } from "$lib/firestore/watchTargets";
  import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    type DocumentData,
  } from "firebase/firestore";

  let channelUrl = "";
  let saving = false;
  let errorMsg = "";

  type WatchTarget = {
    id: string;
    uid: string;
    channelUrl: string;
    enabled: boolean;
    createdAt?: any;
    updatedAt?: any;
  };

  let list: WatchTarget[] = [];
  let loading = true;

  let unsub: null | (() => void) = null;

  onMount(() => {
    const uid = get(user).uid;

    const q = query(
      collection(db, "watch_targets"),
      where("uid", "==", uid),
      orderBy("updatedAt", "desc")
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as WatchTarget[];
        loading = false;
      },
      (err) => {
        errorMsg = err?.message ?? String(err);
        loading = false;
      }
    );
  });

  onDestroy(() => unsub?.());

  async function submit() {
    const uid = get(user).uid;
    const v = channelUrl.trim();
    if (!v) return;

    saving = true;
    errorMsg = "";
    try {
      await upsertWatchTarget(uid, v);
      channelUrl = "";
    } catch (e: any) {
      errorMsg = e?.message ?? String(e);
    } finally {
      saving = false;
    }
  }

  async function toggleEnabled(item: WatchTarget) {
    const uid = get(user).uid;
    try {
      await setWatchTargetEnabled(uid, item.channelUrl, !item.enabled);
    } catch (e: any) {
      errorMsg = e?.message ?? String(e);
    }
  }

  async function remove(item: WatchTarget) {
    const uid = get(user).uid;
    try {
      await removeWatchTarget(uid, item.channelUrl);
    } catch (e: any) {
      errorMsg = e?.message ?? String(e);
    }
  }
</script>

<section class="wrap">
  <div class="head">
    <div>
      <h1 class="h1">채널 감시</h1>
      <p class="p">채널 URL을 등록하면 워커가 새 영상 감지 시 signals를 생성해.</p>
    </div>
  </div>

  <div class="card">
    <label class="label">채널 URL</label>
    <div class="row">
      <input
        class="input"
        placeholder="https://www.youtube.com/@..."
        bind:value={channelUrl}
        on:keydown={(e) => e.key === "Enter" && submit()}
      />
      <button class="btn" disabled={saving || !channelUrl.trim()} on:click={submit}>
        {saving ? "저장중..." : "실시간감시"}
      </button>
    </div>

    {#if errorMsg}
      <div class="err">{errorMsg}</div>
    {/if}
  </div>

  <div class="subhead">
    <div class="h2">내 감시목록</div>
    <div class="pill">{list.length}개</div>
  </div>

  {#if loading}
    <div class="state">불러오는 중...</div>
  {:else if list.length === 0}
    <div class="state">등록된 채널이 없어. 위에서 URL을 추가해봐.</div>
  {:else}
    <div class="list">
      {#each list as it (it.id)}
        <div class="item">
          <div class="meta">
            <div class="url">{it.channelUrl}</div>
            <div class="mini">{it.enabled ? "감시중" : "일시정지"}</div>
          </div>

          <div class="actions">
            <button class="chip" on:click={() => toggleEnabled(it)}>
              {it.enabled ? "OFF" : "ON"}
            </button>
            <button class="chip danger" on:click={() => remove(it)}>
              삭제
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .wrap{ max-width:1100px; margin:0 auto; }
  .head{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:16px; }
  .h1{ margin:0; font-size:20px; letter-spacing:-0.02em; }
  .p{ margin:8px 0 0; font-size:13px; color:var(--muted); }

  .card{
    border:1px solid var(--border);
    background:var(--panel);
    border-radius:20px;
    padding:14px;
    box-shadow:0 10px 30px rgba(0,0,0,0.06);
  }
  .label{ display:block; font-size:12px; color:var(--muted); margin-bottom:8px; }
  .row{ display:flex; gap:10px; align-items:center; }
  .input{
    flex:1;
    min-width:0;
    height:44px;
    border-radius:14px;
    border:1px solid var(--border);
    background:transparent;
    padding:0 12px;
    color:var(--text);
    outline:none;
  }
  .btn{
    height:44px;
    padding:0 14px;
    border-radius:14px;
    border:1px solid var(--border);
    background:var(--panel2, var(--panel));
    font-weight:900;
    cursor:pointer;
  }
  .btn:disabled{ opacity:0.5; cursor:not-allowed; }

  .err{ margin-top:10px; font-size:12px; color:#ef4444; }

  .subhead{ display:flex; align-items:center; justify-content:space-between; margin:18px 2px 10px; }
  .h2{ font-size:14px; font-weight:900; }
  .pill{
    font-size:12px; color:var(--muted);
    border:1px solid var(--border); background:var(--panel);
    padding:8px 12px; border-radius:999px; font-weight:1000;
  }

  .state{
    border:1px dashed var(--border);
    border-radius:18px;
    background:var(--panel);
    padding:18px;
    color:var(--muted);
    font-size:13px;
  }

  .list{ display:flex; flex-direction:column; gap:10px; }
  .item{
    display:flex;
    justify-content:space-between;
    gap:12px;
    align-items:center;
    border:1px solid var(--border);
    background:var(--panel);
    border-radius:18px;
    padding:12px 12px;
  }
  /* ✅ 모바일 터치 영역 크게 */
  .item{ min-height:64px; }
  .url{ font-size:13px; font-weight:800; word-break:break-all; }
  .mini{ margin-top:4px; font-size:12px; color:var(--muted); }

  .actions{ display:flex; gap:8px; }
  .chip{
    min-width:56px;
    height:40px;
    border-radius:999px;
    border:1px solid var(--border);
    background:transparent;
    font-weight:1000;
    cursor:pointer;
  }
  .chip.danger{ border-color: rgba(239,68,68,0.35); color:#ef4444; }
</style>
