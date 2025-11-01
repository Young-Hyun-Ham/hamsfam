
// app/(content-header)/chatSample/page.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToolPicker, type ToolUi } from "@/app/(content-header)/chat/components/McpToolPicker";
import { api } from "@/lib/axios";

// ===== 샘플 상수들 =====
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o-mini";
// 데모 편의상 하드코딩 — 실제로는 로그인 유저 ID를 사용하세요
const DEMO_USER_ID = "515abe98-c1ea-4f95-ba36-bab7d7507df8";

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Discover 결과
  const [tools, setTools] = useState<ToolUi[]>([]);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // 스트리밍 결과 표시용
  const [streamText, setStreamText] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [streamText]);

  const canAsk = useMemo(() => question.trim().length > 0 && !loading, [question, loading]);

  async function onDiscover() {
    if (!canAsk) return;
    setLoading(true);
    try {
      const nextMessages = [...messages, { role: "user", content: question }];
      setMessages(nextMessages);

      const { data } = await api.post("/api/chat/agent/discover", {
          userId: DEMO_USER_ID,
          messages: nextMessages,
          model: DEFAULT_MODEL,
          // mcpIds: ["특정 MCP만"] // 필요시 제한
        });
      // if (!res.ok) throw new Error(await res.text());
      // const json = await res.json();
      setTools(data.tools as ToolUi[]);
      setRecommended(data.recommended as string[]);
      setShowPicker(true);
    } catch (e: any) {
      alert("discover error: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const abortRef = useRef<AbortController | null>(null);
  const aborter = new AbortController();
  
  async function onRunSelected(selected: { oaName: string; args?: any }[]) {
    setShowPicker(false);
    setStreamText("");
    setLoading(true);

    abortRef.current = aborter;

    try {
      await streamChatCompletion(
        messages,
        (chunk) => setStreamText(prev => prev + chunk),
        aborter.signal,
        { model: DEFAULT_MODEL }
      );

      // const { data } = await api.post("/api/chat/agent/execute", {
      //     userId: DEMO_USER_ID,
      //     // mcpIds: [...optional filter]
      //     messages,
      //     model: DEFAULT_MODEL,
      //     selected,
      //   },
      // );
      //   console.log("execute ====>", data)
      // if (!res.ok || !res.body) {
      //   const txt = await res.text().catch(() => "");
      //   throw new Error("execute upstream error: " + txt);
      // }

      // 스트림 읽기
      // const reader = res.body.getReader();
      // const dec = new TextDecoder();
      // while (true) {
      //   const { value, done } = await reader.read();
      //   if (done) break;
      //   setStreamText(prev => prev + dec.decode(value, { stream: true }));
      // }
    } catch (e: any) {
      alert("execute error: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function streamChatCompletion(
    messages: any[],
    onChunk: (textChunk: string) => void,
    signal?: AbortSignal,
    options?: any
  ): Promise<void> {
    let lastLen = 0;
  
    await api.post(
      '/api/chat/agent/execute',
      { messages, options },
      {
        //baseURL: `${CHAT_BASE}`,     // ← per-request로 baseURL override
        responseType: 'text',        // XHR 텍스트 스트림
        signal,
        onDownloadProgress: (pe) => {
          // axios의 XHR 객체에 누적 텍스트가 들어있음
          const xhr = pe.event?.target as XMLHttpRequest | undefined;
          const whole = xhr?.responseText ?? '';
          if (!whole) return;
  
          // 이번에 새로 들어온 부분만 잘라서 콜백으로 전달
          const next = whole.slice(lastLen);
          lastLen = whole.length;
          if (next) onChunk(next);
        },
      },
    );
  }

  function cancelChat() {
    console.log("취소가 되긴 하니? ")
    aborter.abort();
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">MCP Agent Chat (동의 기반)</h1>

      <div className="rounded-2xl border p-4 space-y-3">
        <label className="text-sm font-medium">질문</label>
        <textarea
          className="w-full border rounded-xl p-3 min-h-[96px]"
          placeholder="예) 내 구글 드라이브에서 최신 보고서 요약해줘"
          value={question}
          onChange={e => setQuestion(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={onDiscover}
            disabled={!canAsk}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-40"
          >도구 추천 보기</button>
          {loading && (
            <>
              <button onClick={cancelChat}>취소</button>
              <span>&nbsp;|&nbsp;</span>
              <span className="text-sm text-zinc-500">처리 중…</span>
            </>
          )}
        </div>
      </div>

      {/* 스트리밍 출력 */}
      <div className="rounded-2xl border p-4">
        <div className="text-sm font-medium mb-2">답변</div>
        <div ref={streamRef} className="min-h-[140px] max-h-[240px] overflow-auto whitespace-pre-wrap">
          {streamText || <span className="text-zinc-400">(아직 없음)</span>}
        </div>
      </div>

      {/* ToolPicker 모달/패널 */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <ToolPicker
            tools={tools}
            recommended={recommended}
            onRun={onRunSelected}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}

      {/* 간단한 히스토리 표시 */}
      <div className="rounded-2xl border p-4">
        <div className="text-sm font-medium mb-2">대화 히스토리 (요약)</div>
        <ul className="space-y-1 text-sm">
          {messages.map((m, i) => (
            <li key={i} className="truncate"><b>{m.role}:</b> {String(m.content).slice(0, 120)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
