<!-- src/routes/signals/+page.svelte -->
<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { db } from "$lib/firebase/client";
  import { user } from "$lib/stores/user";
  import { get } from "svelte/store";
  import SignalCard from "$lib/components/SignalCard.svelte";
  import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    serverTimestamp,
    getDocs,
  } from "firebase/firestore";

  let signals: any[] = [];
  let errorMsg = "";
  let loading = true;

  let unsub: (() => void) | null = null;

  onMount(async () => {
    const uid = get(user).uid;

    try {
      console.log("[signals] uid =", uid);

      // ✅ 1) 일단 where/orderBy 없이 5개만 한번 조회 (컬렉션 자체가 보이는지 확인)
      const baseSnap = await getDocs(query(collection(db, "signals"), limit(5)));
      console.log("[signals] base getDocs count =", baseSnap.size);

      // ✅ 2) 실제 화면용 쿼리 (uid + createdAt desc)
      const q = query(
        collection(db, "signals"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      unsub = onSnapshot(
        q,
        (snap) => {
          console.log("[signals] onSnapshot count =", snap.size);
          signals = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          loading = false;
        },
        (err) => {
          console.error("[signals] onSnapshot error", err);
          errorMsg = err?.message ?? String(err);
          loading = false;
        }
      );
    } catch (e: any) {
      console.error("[signals] mount error", e);
      errorMsg = e?.message ?? String(e);
      loading = false;
    }
  });

  onDestroy(() => unsub?.());

  // 테스트용 시그널 시드 추가 함수
  let seeding = false;
  async function seedSignal() {
    const uid = get(user).uid; // 지금은 "demo"
    seeding = true;
    errorMsg = "";

    try {
      const ref = await addDoc(collection(db, "signals"), {
        uid,
        status: "queued",
        videoTitle: `테스트 영상 ${new Date().toLocaleString("ko-KR")}`,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        stocks: [
          { code: "005930", name: "삼성전자", reason: "테스트 근거(예시) - 실적/수급 언급" },
          { code: "000660", name: "SK하이닉스", reason: "테스트 근거(예시) - 반도체 업황" },
        ],
        transcript:
          "이건 Step2 테스트용 transcript 예시입니다.\n\n- STT 전이라도 UI 접기/펼치기 확인 가능\n- 나중에 워커가 실제 transcript로 덮어씁니다.",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 생성된 문서가 바로 리스트에 뜰 거야 (onSnapshot)
      console.log("seeded signal id:", ref.id);
    } catch (e: any) {
      errorMsg = e?.message ?? String(e);
    } finally {
      seeding = false;
    }
  }
</script>

<section class="wrap">
  <div class="head">
    <div>
      <h1 class="h1">실시간 시그널</h1>
      <p class="p">Firestore onSnapshot으로 새 분석 결과가 즉시 반영돼.</p>
    </div>
    <div class="head-right">
      <button class="seed" disabled={seeding} on:click={seedSignal}>
        {seeding ? "생성중..." : "테스트 시그널 생성"}
      </button>
      <div class="pill">{signals.length}개</div>
    </div>
  </div>

  {#if loading}
    <div class="state">불러오는 중...</div>
  {:else if errorMsg}
    <div class="state error">{errorMsg}</div>
  {:else if signals.length === 0}
    <div class="state">아직 시그널이 없어. /watch에서 채널을 등록해봐.</div>
  {:else}
    <div class="grid">
      {#each signals as s (s.id)}
        <a class="card-link" href={`/signals/${s.id}`}>
          <SignalCard {s} />
        </a>
      {/each}
    </div>
  {/if}
</section>

<style>
  .wrap{ max-width: 1100px; margin: 0 auto; }
  .head{
    display:flex;
    align-items:flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }
  .h1{ margin: 0; font-size: 20px; letter-spacing: -0.02em; }
  .p{ margin: 8px 0 0; font-size: 13px; color: var(--muted); }
  .pill{
    font-size: 12px;
    color: var(--muted);
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 8px 12px;
    border-radius: 999px;
    font-weight: 1000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.06);
  }
  .state{
    border: 1px dashed var(--border);
    border-radius: 18px;
    background: var(--panel);
    padding: 18px;
    color: var(--muted);
    font-size: 13px;
  }
  .state.error{ color: #ef4444; border-style: solid; border-color: rgba(239,68,68,0.25); }

  .grid{
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 900px){
    .grid{ grid-template-columns: 1fr; }
  }

  .card-link{
    display:block;
    text-decoration:none;
    color: inherit;
    border-radius: 22px; /* 카드 모서리랑 비슷하게 */
    -webkit-tap-highlight-color: transparent;
  }
  .card-link:focus-visible{
    outline: 2px solid rgba(59,130,246,0.55);
    outline-offset: 4px;
  }

  /* 테스트 버튼 */
  .head-right{
    display:flex;
    align-items:center;
    gap:10px;
  }

  .seed{
    height:44px;                 /* ✅ 모바일 터치 영역 */
    padding:0 14px;
    border-radius:14px;
    border:1px solid var(--border);
    background: var(--panel);
    color: var(--text);
    font-weight: 1000;
    cursor:pointer;
    box-shadow: 0 10px 30px rgba(0,0,0,0.06);
  }
  .seed:disabled{
    opacity:0.6;
    cursor:not-allowed;
  }
</style>
