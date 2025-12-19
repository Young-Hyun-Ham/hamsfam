// app/api/chatbot/postgres/answer/route.ts
// app/api/chatbot/postgres/answer/route.ts

/**
 * =========================
 * PostgreSQL DDL (MVP)
 * =========================
 * CREATE EXTENSION IF NOT EXISTS pgcrypto;
 * 
 * -- 프로젝트
 * CREATE TABLE IF NOT EXISTS knowledge_projects (
 *   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name         TEXT NOT NULL,
 *   description  TEXT,
 *   status       TEXT DEFAULT 'active',
 *   created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 *
 * -- 인텐트
 * -- training_phrases 는 TEXT[] 로 MVP 처리 (jsonb로 바꿔도 됨)
 * CREATE TABLE IF NOT EXISTS knowledge_intents (
 *   id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id       UUID NOT NULL REFERENCES knowledge_projects(id) ON DELETE CASCADE,
 *   name             TEXT NOT NULL,
 *   display_name     TEXT,
 *   description      TEXT,
 *   is_fallback      BOOLEAN NOT NULL DEFAULT false,
 *   training_phrases TEXT[] NOT NULL DEFAULT '{}',
 *   created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 * CREATE INDEX IF NOT EXISTS idx_knowledge_intents_project_id
 *   ON knowledge_intents(project_id);
 *
 * -- 엔티티
 * -- values 는 JSONB 로 MVP 처리:
 * -- [
 * --   { "value": "아메리카노", "synonyms": ["아메", "americano"] },
 * --   { "value": "라떼", "synonyms": ["latte"] }
 * -- ]
 * CREATE TABLE IF NOT EXISTS knowledge_entities (
 *   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id   UUID NOT NULL REFERENCES knowledge_projects(id) ON DELETE CASCADE,
 *   name         TEXT NOT NULL, -- entity key (예: "drink")
 *   display_name TEXT,
 *   description  TEXT,
 *   values       JSONB NOT NULL DEFAULT '[]'::jsonb,
 *   created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 * CREATE INDEX IF NOT EXISTS idx_knowledge_entities_project_id
 *   ON knowledge_entities(project_id);
 *
 * -- (선택) updated_at 자동 갱신 트리거는 프로젝트 정책대로 추가 가능
 */

// ✅ pg는 Node 런타임에서만 안전
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/postgresql';

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
  value: string;
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
        localBest = Math.max(localBest, phrase.length);
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

/** Postgres: intents list */
async function listIntents(projectId: string) {
  const sql = `
    SELECT
      id::text        AS id,
      name            AS name,
      display_name    AS "displayName",
      description     AS description,
      is_fallback     AS "isFallback",
      training_phrases AS "trainingPhrases"
    FROM knowledge_intents
    WHERE project_id = $1::uuid
    ORDER BY created_at DESC
  `;

  const { rows } = await db.query(sql, [projectId]);

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    displayName: r.displayName ?? undefined,
    description: r.description ?? undefined,
    isFallback: Boolean(r.isFallback),
    // pg는 text[]를 배열로 준다
    trainingPhrases: Array.isArray(r.trainingPhrases) ? r.trainingPhrases : [],
  }));
}

/** Postgres: entities list */
async function listEntities(projectId: string) {
  const sql = `
    SELECT
      id::text      AS id,
      name          AS name,
      display_name  AS "displayName",
      description   AS description,
      values        AS values
    FROM knowledge_entities
    WHERE project_id = $1::uuid
    ORDER BY created_at DESC
  `;

  const { rows } = await db.query(sql, [projectId]);

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    displayName: r.displayName ?? undefined,
    description: r.description ?? undefined,
    // values(jsonb)는 보통 object/array로 파싱되어 옴
    values: Array.isArray(r.values) ? r.values : [],
  }));
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

    const reply =
      matched?.isFallback
        ? "죄송해요. 정확히 이해하지 못했어요. 조금 더 구체적으로 말씀해 주세요."
        : matched
        ? `인텐트: ${matched.displayName ?? matched.name} 로 처리할게요.`
        : "처리할 인텐트를 찾지 못했습니다.";

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
      answer: reply,
      debug: { intentsCount: intents.length, entitiesCount: entities.length },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
