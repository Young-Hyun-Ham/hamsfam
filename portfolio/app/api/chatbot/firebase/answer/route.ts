// app/api/chatbot/firebase/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { embedText } from "@/lib/ai/geminiEmbedding";

const EMBEDDING_VERSION = 1;

type AnswerRequest = {
  projectId: string;
  text: string;
  locale?: string;
  systemPrompt?: string;
  mode?: "plan" | "full";
};

type MatchedIntent = {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isFallback?: boolean;
  score: number;
};

type ScenarioSuggest = {
  scenarioKey: string;
  scenarioTitle?: string;
  confirmEnabled?: boolean;
  confirmMessage?: string;
  autoRun?: boolean;
} | null;

function normalize(v: string) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

/** /api/chat/gemini 스트리밍을 끝까지 읽어서 텍스트로 변환 */
async function callGeminiStreamToText(
  req: NextRequest,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const origin = new URL(req.url).origin;

  const res = await fetch(`${origin}/api/chat/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemPrompt }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status} ${msg}`);
  }
  if (!res.body) throw new Error("Gemini: no response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode(); // flush

  return out.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnswerRequest;
    const projectId = normalize(body.projectId);
    const input = normalize(body.text);

    if (!projectId || !input) {
      return NextResponse.json(
        { ok: false, message: "projectId/text is required" },
        { status: 400 }
      );
    }

    /** 1) 프로젝트 설정 읽기 (intentThreshold) */
    const projectRef = doc(db, "knowledge_projects", projectId);
    const projectSnap = await getDoc(projectRef);
    const projectData = projectSnap.exists()
      ? (projectSnap.data() as any)
      : null;

    const intentThreshold =
      typeof projectData?.intentThreshold === "number"
        ? projectData.intentThreshold
        : 0.75;

    /** 2) 입력 임베딩 */
    const embedded = await embedText(input);
    const inputVec = embedded.values;
    // console.log("입력 임베딩:=========>  ", input, inputVec)

    // 임베딩이 비어있으면 매칭 불가 → plan 모드면 gemini로
    if (!inputVec?.length) {
      const mode = body.mode ?? "plan";
      const shouldCallGemini = true;

      const answer =
        mode === "full"
          ? await callGeminiStreamToText(req, input, body.systemPrompt)
          : null;

      return NextResponse.json({
        ok: true,
        projectId,
        input,
        intent: null,
        entities: [],
        scenario: null,
        fallback: true,
        answer,
        shouldCallGemini: mode === "plan",
        gemini:
          mode === "plan"
            ? {
                prompt: input,
                systemPrompt: body.systemPrompt ?? null,
                reason: "no_intent",
              }
            : null,
        debug: {
          intentThreshold,
          intentsCount: 0,
          top: null,
          embedModel: embedded.model,
          embedDim: embedded.dim,
        },
      });
    }

    /** 3) 인텐트 로드 (학습된 것만: embeddingVersion == 1) */
    const intentsRef = collection(db, "knowledge_projects", projectId, "intents");
    const intentsSnap = await getDocs(
      query(intentsRef, where("embeddingVersion", "==", EMBEDDING_VERSION))
    );

    let fallbackIntent: any | null = null;

    const candidates: Array<{ docId: string; data: any; score: number }> = [];
    intentsSnap.forEach((d) => {
      const data = d.data() as any;
      // console.log("intent data:=========>  ", data)

      if (data?.isFallback) fallbackIntent = { id: d.id, ...data };

      // embeddingDim 우선, 없으면 embedding.length로 추정
      const emb: number[] | undefined = Array.isArray(data?.embedding)
        ? data.embedding
        : undefined;

      if (!emb || emb.length === 0) return;

      const embDim = typeof data?.embeddingDim === "number" ? data.embeddingDim : emb.length;

      // dim mismatch는 비교 불가 → 스킵 (중요)
      if (embDim !== inputVec.length) return;
      // 학습 필요 상태면 스킵(옵션: 안정성)
      if (data?.needsEmbedding === true) return;
      const score = cosineSimilarity(inputVec, emb);
      candidates.push({ docId: d.id, data, score });
    });
    // console.log("매칭 후보들:=========>  ", candidates)

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0] ?? null;
    const topScore = top?.score ?? 0;

    /** 4) 매칭 결정 */
    let matched: MatchedIntent | null = null;
    let fallback = false;

    if (top && topScore >= intentThreshold) {
      matched = {
        id: top.docId,
        name: top.data?.name ?? top.docId,
        displayName: top.data?.displayName,
        description: top.data?.description,
        isFallback: !!top.data?.isFallback,
        score: Number(topScore.toFixed(6)),
      };
      fallback = !!top.data?.isFallback;
    } else if (fallbackIntent) {
      matched = {
        id: fallbackIntent.id,
        name: fallbackIntent?.name ?? fallbackIntent.id,
        displayName: fallbackIntent?.displayName,
        description: fallbackIntent?.description,
        isFallback: true,
        score: Number(topScore.toFixed(6)),
      };
      fallback = true;
    }
    
    // hit(매칭된 인텐트 문서 데이터) 잡기
    const hit = matched?.id ? (matched.id === top?.docId ? top?.data : null) : null;
    // console.log("매칭된 인텐트 문서 데이터:=========>  ", hit)

    // scenario 내려주기
    const scenario: ScenarioSuggest = (() => {
      const src = hit;
      const key = typeof src?.scenarioKey === "string" ? src.scenarioKey.trim() : "";
      if (!key) return null;

      const confirmEnabled =
        typeof src?.confirmEnabled === "boolean" ? src.confirmEnabled : true;

      const confirmMessageRaw =
        typeof src?.confirmMessage === "string" ? src.confirmMessage.trim() : "";

      return {
        scenarioKey: key,
        scenarioTitle: typeof src?.scenarioTitle === "string" ? src.scenarioTitle.trim() : undefined,
        autoRun: typeof src?.autoRun === "boolean" ? src.autoRun : false,
        confirmEnabled,
        // confirmEnabled=true면 confirmMessage 내려주고, 없으면 프론트가 기본문구 사용하게 빈값 허용
        confirmMessage: confirmEnabled ? (confirmMessageRaw || "") : "",
      };
    })();
    // console.log("시나리오 제안:=========>  ", scenario)

    /** 5) 답변 선택 정책 */
    let canned: string | null = null;
    if (matched?.id) {
      const hit = matched.id === top?.docId ? top?.data : null;
      const v = hit?.answer ?? hit?.response ?? null;
      if (typeof v === "string" && v.trim()) canned = v.trim();
    }
    if (!canned && fallbackIntent) {
      const v = fallbackIntent?.answer ?? fallbackIntent?.response ?? null;
      if (typeof v === "string" && v.trim()) canned = v.trim();
    }

    const mode = body.mode ?? "plan";
    let answer: string | null = null;
    let shouldCallGemini = false;
    let geminiReason: "no_intent" | "below_threshold" | "no_canned" | null =
      null;

    // console.log("답변 선택 정책:======================> ", canned)
    if (canned) {
      answer = canned;
    } else {
      // canned가 없어도 scenarioKey가 있으면 Gemini 호출하지 않음(시나리오 suggest)
      if (scenario?.scenarioKey) {
        shouldCallGemini = false;
        geminiReason = null;
      } else {
        shouldCallGemini = true;

        if (!matched) geminiReason = "no_intent";
        else if (fallback) geminiReason = "below_threshold";
        else geminiReason = "no_canned";

        if (mode === "full") {
          answer = await callGeminiStreamToText(req, input, body.systemPrompt);
          shouldCallGemini = false;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      projectId,
      input,
      intent: matched,
      entities: [],
      scenario,
      fallback,
      answer,
      shouldCallGemini,
      gemini: shouldCallGemini
        ? {
            prompt: input,
            systemPrompt: body.systemPrompt ?? null,
            reason: geminiReason,
          }
        : null,
      debug: {
        intentThreshold,
        intentsCount: intentsSnap.size,
        top: top
          ? {
              id: top.docId,
              name: top.data?.name ?? top.docId,
              score: Number(top.score.toFixed(6)),
              needsEmbedding: !!top.data?.needsEmbedding,
              embeddingDim:
                typeof top.data?.embeddingDim === "number"
                  ? top.data.embeddingDim
                  : Array.isArray(top.data?.embedding)
                  ? top.data.embedding.length
                  : null,
              embeddingModel: top.data?.embeddingModel ?? null,
            }
          : null,
        inputEmbedding: {
          model: embedded.model,
          dim: embedded.dim,
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "answer error" },
      { status: 500 }
    );
  }
}
