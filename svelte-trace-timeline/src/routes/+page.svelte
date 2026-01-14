<script lang="ts">
  const ENGINE_URL = import.meta.env.VITE_ENGINE_URL ?? "http://127.0.0.1:8000";

  // ---------- Types ----------
  type QuickReply = { value: string; display: string };
  type Message = { ts?: string; role: "user" | "assistant"; content: string; meta?: any };
  type Awaiting =
    | { kind: "slot"; nodeId: string; slot: string; next?: string }
    | { kind: "branch"; nodeId: string; routes?: Record<string, string> };

  type RunScenarioRes = {
    ok: boolean;
    runId?: string;
    messages?: Message[];
    slots?: Record<string, any>;
    vars?: Record<string, any>;
    trace?: any[];
    awaiting?: Awaiting | null;
    state?: any;
  };

  // ---------- Builder Flow (너가 준 데이터) ----------
  const nodes = [
  {
    "dragging": false,
    "type": "slotfilling",
    "height": 330,
    "width": 250,
    "data": {
      "id": "slotfilling-1765937679841-o6g169g",
      "replies": [
        {
          "value": "1",
          "display": "A"
        },
        {
          "value": "2",
          "display": "B"
        }
      ],
      "content": "어느것을 선택 하십니까?",
      "slot": "data"
    },
    "positionAbsolute": {
      "x": 60.49676106081051,
      "y": 41.21010310653256
    },
    "id": "slotfilling-1765937679841-o6g169g",
    "selected": false,
    "position": {
      "x": 60.49676106081051,
      "y": 41.21010310653256
    }
  },
  {
    "type": "message",
    "dragging": false,
    "selected": false,
    "position": {
      "x": 363.5552309544835,
      "y": 40.27447024854297
    },
    "data": {
      "id": "message-1765937713246-5wsqxkv",
      "content": "A: {{A}}\nB: {{B}}\ndata: {{data}}",
      "chainNext": false,
      "replies": []
    },
    "width": 250,
    "id": "message-1765937713246-5wsqxkv",
    "positionAbsolute": {
      "x": 363.5552309544835,
      "y": 40.27447024854297
    },
    "height": 165
  },
  {
    "type": "branch",
    "position": {
      "x": 119.31745069698133,
      "y": 524.6590815006363
    },
    "dragging": false,
    "id": "branch-1765938493354-po6yy8i",
    "positionAbsolute": {
      "x": 119.31745069698133,
      "y": 524.6590815006363
    },
    "width": 250,
    "data": {
      "conditions": [
        {
          "slot": "",
          "valueType": "value",
          "operator": "==",
          "value": "",
          "id": "cond-1765938493354"
        }
      ],
      "replies": [
        {
          "value": "cond_1765938493354",
          "display": "A"
        },
        {
          "value": "cond_1765938513590-fa8vn03",
          "display": "B"
        }
      ],
      "evaluationType": "BUTTON",
      "content": "차이가 몰까?",
      "id": "branch-1765938493354-po6yy8i"
    },
    "height": 321,
    "selected": false
  },
  {
    "data": {
      "replies": [],
      "chainNext": false,
      "id": "message-1765938597984-bgtyak5",
      "content": "A 선택"
    },
    "dragging": false,
    "type": "message",
    "width": 250,
    "id": "message-1765938597984-bgtyak5",
    "selected": false,
    "height": 165,
    "position": {
      "x": 563.5391461770574,
      "y": 285.19562600817375
    },
    "positionAbsolute": {
      "x": 563.5391461770574,
      "y": 285.19562600817375
    }
  },
  {
    "positionAbsolute": {
      "x": 566.2525411126676,
      "y": 693.487732980601
    },
    "dragging": false,
    "width": 250,
    "position": {
      "y": 693.487732980601,
      "x": 566.2525411126676
    },
    "type": "message",
    "data": {
      "id": "message-1765938617377-kgdmtgf",
      "replies": [],
      "content": "B선택",
      "chainNext": false
    },
    "height": 165,
    "selected": false,
    "id": "message-1765938617377-kgdmtgf"
  },
  {
    "id": "message-1767944530460-fq13e0i",
    "type": "message",
    "position": {
      "x": 896.7148742393979,
      "y": 308.1355745618315
    },
    "data": {
      "id": "message-1767944530460-fq13e0i",
      "content": "data = {{data}}",
      "replies": [],
      "chainNext": false
    },
    "width": 250,
    "height": 165,
    "selected": false,
    "dragging": false
  }
]

  const edges = [
  {
    "target": "message-1765937713246-5wsqxkv",
    "sourceHandle": null,
    "targetHandle": null,
    "id": "reactflow__edge-slotfilling-1765937679841-o6g169g-message-1765937713246-5wsqxkv",
    "source": "slotfilling-1765937679841-o6g169g"
  },
  {
    "sourceHandle": null,
    "source": "message-1765937713246-5wsqxkv",
    "target": "branch-1765938493354-po6yy8i",
    "id": "reactflow__edge-message-1765937713246-5wsqxkv-branch-1765938493354-po6yy8i",
    "targetHandle": null
  },
  {
    "targetHandle": null,
    "sourceHandle": "cond_1765938493354",
    "id": "reactflow__edge-branch-1765938493354-po6yy8icond_1765938493354-message-1765938597984-bgtyak5",
    "target": "message-1765938597984-bgtyak5",
    "source": "branch-1765938493354-po6yy8i"
  },
  {
    "source": "branch-1765938493354-po6yy8i",
    "targetHandle": null,
    "sourceHandle": "cond_1765938513590-fa8vn03",
    "id": "reactflow__edge-branch-1765938493354-po6yy8icond_1765938513590-fa8vn03-message-1765938617377-kgdmtgf",
    "target": "message-1765938617377-kgdmtgf"
  },
  {
    "source": "message-1765938597984-bgtyak5",
    "sourceHandle": null,
    "target": "message-1767944530460-fq13e0i",
    "targetHandle": null,
    "id": "reactflow__edge-message-1765938597984-bgtyak5-message-1767944530460-fq13e0i"
  }
]

  // ---------- UI State ----------
  let inputText = "";
  let loading = false;
  let error = "";

  let runId: string | null = null;
  let engineState: any = null;

  let messages: Message[] = [];
  let awaiting: Awaiting | null = null;
  let slots: Record<string, any> = {};
  let trace: any[] = [];

  // 마지막 assistant 메시지에서 quickReplies를 가져와 버튼 렌더
  function getQuickReplies(): QuickReply[] {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.meta?.quickReplies) {
        return m.meta.quickReplies as QuickReply[];
      }
    }
    return [];
  }

  function appendNewMessages(prev: Message[], incoming: Message[]) {
    // 엔진이 state.messages 전체를 줄 수도 있고, 누적만 줄 수도 있음.
    // 지금 엔진은 누적 messages를 state에 들고 있으니, 응답 messages를 "전체"로 보는게 안전.
    // -> 그냥 덮어쓴다.
    return incoming ?? prev;
  }

  async function callEngine(params: {
    text?: string;
    action?: { type: "reply"; value: string; display?: string } | null;
    reset?: boolean;
  }) {
    loading = true;
    error = "";
    try {
      const body = {
        nodes,
        edges,
        text: params.text ?? "",
        state: params.reset ? null : engineState,
        action: params.action ?? null
      };

      console.log("callEngine body:", body);

      const res = await fetch(`${ENGINE_URL}/runScenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${t}`);
      }

      const data = (await res.json()) as RunScenarioRes;

      runId = data.runId ?? runId;
      engineState = data.state ?? engineState;

      messages = appendNewMessages(messages, data.messages ?? []);
      awaiting = (data.awaiting ?? null) as any;
      slots = data.slots ?? {};
      trace = data.trace ?? [];
    } catch (e: any) {
      error = e?.message ?? String(e);
    } finally {
      loading = false;
    }
  }

  // 1) 새 실행
  async function startRun() {
    runId = null;
    engineState = null;
    messages = [];
    awaiting = null;
    slots = {};
    trace = [];
    inputText = "";

    // 첫 턴: text를 ""로 보내도 됨
    await callEngine({ text: "", action: null, reset: true });
  }

  // 2) 텍스트 입력 전송 (awaiting이 없거나, 입력 기반으로 진행시키고 싶을 때)
  async function sendText() {
    if (awaiting) return;
    const t = inputText.trim();
    if (!t) return;
    inputText = "";
    await callEngine({ text: t, action: null, reset: false });
  }

  // 3) 버튼 클릭 전송 (slotfilling/branch 모두 reply로 처리)
  async function clickReply(r: QuickReply) {
    await callEngine({
      text: "",
      action: { type: "reply", value: r.value, display: r.display },
      reset: false
    });
  }
</script>

<div class="wrap">
  <header class="top">
    <h1>SvelteKit + LangGraph Scenario Runner</h1>
    <div class="row">
      <button class="btn" on:click={startRun} disabled={loading}>New Run</button>
      <span class="muted">runId: {runId ?? "-"}</span>
    </div>
  </header>

  {#if error}
    <div class="error">⚠ {error}</div>
  {/if}

  <div class="grid">
    <section class="panel">
      <h2>Chat</h2>

      <div class="chat">
        {#each messages as m, i}
          <div class="bubble {m.role}">
            <div class="role">{m.role}</div>
            <div class="content">{m.content}</div>
          </div>
        {/each}
        {#if !messages.length}
          <div class="empty">New Run을 눌러 시작하세요.</div>
        {/if}
      </div>

      <!-- quick replies -->
      {#if awaiting}
        <div class="replies">
          {#each getQuickReplies() as r}
            <button class="chip" on:click={() => clickReply(r)} disabled={loading}>
              {r.display}
            </button>
          {/each}
        </div>
      {/if}

      <div class="inputRow">
        <input
          class="input"
          placeholder="텍스트 입력 (필요할 때만)"
          bind:value={inputText}
          on:keydown={(e) => e.key === "Enter" && sendText()}
          disabled={loading}
        />
        <button class="btn" on:click={sendText} disabled={loading || !inputText.trim()}>
          Send
        </button>
      </div>

      <div class="meta">
        <div><b>awaiting</b>: {awaiting ? awaiting.kind : "-"}</div>
        <div><b>slots</b>: <code>{JSON.stringify(slots)}</code></div>
      </div>
    </section>

    <section class="panel">
      <h2>Trace</h2>
      <pre class="mono">{JSON.stringify(trace, null, 2)}</pre>
    </section>
  </div>
</div>

<style>
  .wrap { max-width: 1100px; margin: 0 auto; padding: 18px; }
  .top { display:flex; justify-content:space-between; align-items:center; gap: 10px; margin-bottom: 10px; }
  .row { display:flex; gap: 10px; align-items:center; }
  .muted { opacity: .7; font-size: 12px; }

  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }

  .panel { border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 12px; background: white; }
  h1 { margin: 0; font-size: 18px; }
  h2 { margin: 0 0 10px; font-size: 14px; }

  .btn { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,.18); background: #111; color: white; cursor:pointer; }
  .btn:disabled { opacity: .6; cursor:not-allowed; }
  .inputRow { display:flex; gap: 8px; margin-top: 10px; }
  .input { flex: 1; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,.18); outline: none; }
  .error { margin: 10px 0; padding: 10px; border-radius: 10px; background: rgba(255,0,0,.06); border: 1px solid rgba(255,0,0,.18); }

  .chat { display:flex; flex-direction:column; gap: 8px; max-height: 360px; overflow:auto; padding-right: 4px; }
  .bubble { border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 8px 10px; }
  .bubble.user { background: rgba(0,0,0,.03); }
  .role { font-size: 11px; opacity: .7; margin-bottom: 4px; }
  .content { white-space: pre-wrap; word-break: break-word; }

  .replies { display:flex; gap: 8px; flex-wrap:wrap; margin-top: 10px; }
  .chip { padding: 8px 10px; border-radius: 999px; border: 1px solid rgba(0,0,0,.18); background: transparent; cursor:pointer; }
  .chip:disabled { opacity: .6; cursor:not-allowed; }

  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
  .meta { margin-top: 10px; font-size: 12px; opacity: .8; display:flex; flex-direction:column; gap: 6px; }
  code { background: rgba(0,0,0,.06); padding: 2px 6px; border-radius: 8px; }
  .empty { padding: 12px; opacity: .6; text-align:center; border: 1px dashed rgba(0,0,0,.2); border-radius: 10px; }
</style>
