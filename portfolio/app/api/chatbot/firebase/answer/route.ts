// app/api/chatbot/firebase/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  QueryConstraint,
} from "firebase/firestore";

// ---------- types ----------
type AnswerRequest = {
  projectId: string;
  text: string;
  locale?: string;
};

type MatchedIntent = {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isFallback?: boolean;
  score: number;
};

type ExtractedEntity = {
  entityName: string;
  value: string; // canonical value
  matched: string;
  start: number;
  end: number;
};

function normalize(v: string) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}
function lower(v: string) {
  return normalize(v).toLowerCase();
}

/** 1) Rule 기반 intent 매칭 */
function matchIntentByRule(inputText: string, intents: any[]): MatchedIntent | null {
  const t = lower(inputText);
  if (!t) return null;

  let best: MatchedIntent | null = null;

  for (const it of intents ?? []) {
    const phrases: string[] = Array.isArray(it.trainingPhrases) ? it.trainingPhrases : [];
    let localBest = 0;

    for (const p of phrases) {
      const phrase = lower(p);
      if (!phrase) continue;

      if (t.includes(phrase)) {
        localBest = Math.max(localBest, phrase.length); // 길이 점수
      }
    }

    if (localBest > 0) {
      const candidate: MatchedIntent = {
        id: it.id,
        name: it.name,
        displayName: it.displayName,
        description: it.description,
        isFallback: Boolean(it.isFallback),
        score: localBest,
      };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  return best;
}

/** 2) Embedding 확장 포인트 (MVP: 미구현) */
async function matchIntentByEmbedding(_inputText: string, _intents: any[]) {
  return null as MatchedIntent | null;
}

/** synonym dict 기반 entity 추출 */
function extractEntitiesBySynonymDict(inputText: string, entities: any[]): ExtractedEntity[] {
  const raw = normalize(inputText);
  const t = raw.toLowerCase();
  if (!t) return [];

  type DictItem = { entityName: string; value: string; syn: string };
  const dict: DictItem[] = [];

  for (const e of entities ?? []) {
    const entityName = String(e.name ?? "");
    const values = Array.isArray(e.values) ? e.values : [];
    for (const v of values) {
      const canonical = String(v?.value ?? "");
      const synonyms = Array.isArray(v?.synonyms) ? v.synonyms : [];

      const allSyns = [canonical, ...synonyms]
        .map((s: any) => normalize(String(s ?? "")))
        .filter(Boolean);

      for (const syn of allSyns) {
        dict.push({ entityName, value: canonical, syn });
      }
    }
  }

  // 긴 synonym 우선 매칭
  dict.sort((a, b) => b.syn.length - a.syn.length);

  const hits: ExtractedEntity[] = [];
  const used = new Array<boolean>(t.length).fill(false);

  const markUsed = (s: number, e: number) => {
    for (let i = s; i < e; i++) used[i] = true;
  };
  const isFree = (s: number, e: number) => {
    for (let i = s; i < e; i++) if (used[i]) return false;
    return true;
  };

  for (const item of dict) {
    const synLower = item.syn.toLowerCase();
    if (!synLower) continue;

    let from = 0;
    while (true) {
      const idx = t.indexOf(synLower, from);
      if (idx === -1) break;

      const start = idx;
      const end = idx + synLower.length;

      if (isFree(start, end)) {
        hits.push({
          entityName: item.entityName,
          value: item.value,
          matched: raw.slice(start, end),
          start,
          end,
        });
        markUsed(start, end);
      }

      from = idx + 1;
    }
  }

  return hits;
}

async function listIntents(projectId: string) {
  const colRef = collection(db, "knowledge_projects", projectId, "intents");
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  const snap = await getDocs(query(colRef, ...constraints));

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: String(data.name ?? ""),
      displayName: data.displayName ? String(data.displayName) : undefined,
      description: data.description ? String(data.description) : undefined,
      isFallback: Boolean(data.isFallback),
      trainingPhrases: Array.isArray(data.trainingPhrases) ? data.trainingPhrases : [],

      // ✅ 지식 답변(있을 때만 사용)
      answer: data.answer ? String(data.answer) : undefined,

      // scenario 연결 정보
      scenarioKey: data.scenarioKey ? String(data.scenarioKey) : undefined,
      scenarioTitle: data.scenarioTitle ? String(data.scenarioTitle) : undefined,
      confirmMessage: data.confirmMessage ? String(data.confirmMessage) : undefined,
      confirmEnabled: data.confirmEnabled === undefined ? true : Boolean(data.confirmEnabled),
      autoRun: Boolean(data.autoRun),
    };
  });
}

/** Firestore: entities list */
async function listEntities(projectId: string) {
  const colRef = collection(db, "knowledge_projects", projectId, "entities");
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  const snap = await getDocs(query(colRef, ...constraints));

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: String(data.name ?? ""),
      displayName: data.displayName ? String(data.displayName) : undefined,
      description: data.description ? String(data.description) : undefined,
      values: Array.isArray(data.values) ? data.values : [],
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AnswerRequest>;
    const projectId = String(body.projectId ?? "").trim();
    const text = String(body.text ?? "");

    if (!projectId || !normalize(text)) {
      return NextResponse.json(
        { ok: false, error: "projectId, text는 필수입니다." },
        { status: 400 }
      );
    }

    const [intents, entities] = await Promise.all([
      listIntents(projectId),
      listEntities(projectId),
    ]);

    let matched = matchIntentByRule(text, intents);
    if (!matched) matched = await matchIntentByEmbedding(text, intents);

    // 3) fallback
    if (!matched) {
      const fallback = (intents ?? []).find((x: any) => Boolean(x.isFallback));
      if (fallback) {
        matched = {
          id: fallback.id,
          name: fallback.name,
          displayName: fallback.displayName,
          description: fallback.description,
          isFallback: true,
          score: 0,
        };
      }
    }

    const extracted = extractEntitiesBySynonymDict(text, entities);

    const hit = matched
      ? (intents ?? []).find((x: any) => x.id === matched!.id)
      : null;

    const scenarioKey = hit?.scenarioKey ? String(hit.scenarioKey) : "";
    const scenarioTitle = hit?.scenarioTitle ? String(hit.scenarioTitle) : "";
    const confirmEnabled = hit?.confirmEnabled !== false;
    const autoRun = Boolean(hit?.autoRun);

    const confirmMessage =
      hit?.confirmMessage ||
      `[${scenarioTitle || scenarioKey || "시나리오"}]을 실행 하시겠습니까?`;

    // "지식 답변"은 오직 hit.answer가 있을 때만
    const knowledgeAnswer = hit?.answer ? String(hit.answer) : null;

    return NextResponse.json({
      ok: true,
      projectId,
      input: text,
      intent: matched
        ? {
            id: matched.id,
            name: matched.name,
            displayName: matched.displayName,
            isFallback: matched.isFallback ?? false,
            score: matched.score,
          }
        : null,
      entities: extracted,
      scenario: scenarioKey
        ? {
            scenarioKey,
            scenarioTitle: scenarioTitle || scenarioKey,
            confirmEnabled,
            autoRun,
            confirmMessage,
          }
        : null,
      fallback: Boolean(matched?.isFallback),
      answer: knowledgeAnswer,

      debug: { intentsCount: intents.length, entitiesCount: entities.length },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}