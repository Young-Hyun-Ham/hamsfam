// app/api/admin/firebase/train/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
  setDoc,
  limit,
  orderBy,
  documentId,
  QueryConstraint,
} from "firebase/firestore";
import { embedText } from "@/lib/ai/geminiEmbedding";

async function log(jobId: string, message: string, level: "info" | "error" = "info") {
  await addDoc(collection(db, "train_jobs", jobId, "logs"), {
    level,
    message,
    createdAt: serverTimestamp(),
  });
}

// 루트 컬렉션명
const ROOT = "knowledge_projects";

type TargetType = "project" | "intent" | "entity";

function normalizeText(v: any) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

function uniqJoin(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of arr) {
    const t = normalizeText(s);
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join(" ");
}

// Intent 임베딩 입력 텍스트 구성(추천: trainingPhrases 포함)
function buildIntentText(intent: any) {
  const name = normalizeText(intent?.name);
  const displayName = normalizeText(intent?.displayName);
  const desc = normalizeText(intent?.description);

  const phrases: string[] = Array.isArray(intent?.trainingPhrases)
    ? intent.trainingPhrases.map((p: any) => normalizeText(p)).filter(Boolean)
    : [];

  // 검색/매칭에 가장 도움 되는 텍스트를 충분히 넣어준다
  return uniqJoin([
    name,
    displayName,
    desc,
    // phrase는 너무 길어질 수 있으니 상위 N개만
    ...phrases.slice(0, 50),
  ]);
}

// Entity values가 {value, synonyms[]} 구조인 경우를 안전하게 처리
function buildEntityText(entity: any) {
  const name = normalizeText(entity?.name);
  const displayName = normalizeText(entity?.displayName);
  const desc = normalizeText(entity?.description);

  const parts: string[] = [];
  const values = entity?.values;

  if (Array.isArray(values)) {
    for (const v of values) {
      // 1) string 배열인 옛 형태
      if (typeof v === "string") {
        parts.push(normalizeText(v));
        continue;
      }
      // 2) { value, synonyms[] } 형태
      if (v && typeof v === "object") {
        if (v.value) parts.push(normalizeText(v.value));
        if (Array.isArray(v.synonyms)) {
          for (const s of v.synonyms) parts.push(normalizeText(s));
        }
      }
    }
  }

  return uniqJoin([name, displayName, desc, ...parts]);
}

// 임베딩 호출(간단 리트라이)
async function embedWithRetry(jobId: string, text: string, tries = 3) {
  const input = normalizeText(text);
  if (!input) return { values: [], model: "", dim: 0 };

  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await embedText(input);
      if (!Array.isArray(r?.values) || r.values.length === 0) {
        throw new Error("embedding result is empty");
      }
      return r;
    } catch (e: any) {
      lastErr = e;
      await log(jobId, `임베딩 재시도 ${i + 1}/${tries} 실패: ${e?.message ?? e}`, "error");
      // 간단 백오프
      await new Promise((res) => setTimeout(res, 300 * (i + 1)));
    }
  }
  throw lastErr ?? new Error("embed failed");
}

export async function POST(req: NextRequest) {
  const startedAt = new Date().toISOString();
  let body: any = null;

  try {
    body = await req.json();
    const { jobId, projectId, projectName, targetType, triggeredBy, targetIds } = body as {
      jobId: string;
      projectId: string;
      projectName?: string;
      targetType: TargetType;
      triggeredBy?: string;
      targetIds?: string[];
    };

    if (!jobId || !projectId || !targetType) {
      return NextResponse.json({ ok: false, message: "invalid payload" }, { status: 400 });
    }

    const jobRef = doc(db, "train_jobs", jobId);
    const jobSnap = await getDoc(jobRef);

    // job 문서 없으면 생성
    if (!jobSnap.exists()) {
      await setDoc(jobRef, {
        projectId,
        projectName: projectName ?? "",
        targetType,
        triggeredBy: triggeredBy ?? "",
        status: "queued",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // running 처리
    await updateDoc(jobRef, {
      status: "running",
      startedAt,
      updatedAt: serverTimestamp(),
    });

    await log(jobId, `학습 시작 (${targetType})`);

    // 프로젝트 존재 확인(디버깅 도움)
    const projectRef = doc(db, ROOT, projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) {
      await log(jobId, `프로젝트 문서가 존재하지 않습니다: ${ROOT}/${projectId}`, "error");
      await updateDoc(jobRef, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        message: "project not found",
      });
      return NextResponse.json({ ok: false, message: "project not found" }, { status: 404 });
    }

    const intentsCol = collection(db, "knowledge_projects", projectId, "intents");
    const entitiesCol = collection(db, "knowledge_projects", projectId, "entities");

    let intents: any[] = [];
    let entities: any[] = [];

    // ----------------------------
    // intents 로드
    // - project: 전체 로드 (불필요한 where("__name__","!=","") 제거)
    // - intent: needsEmbedding=true 만 로드
    // ----------------------------
    if (targetType === "project" || targetType === "intent") {
      if (Array.isArray(targetIds) && targetIds.length > 0 && targetType === "intent") {
        // 선택된 ID만 학습
        const chunks: string[][] = [];
        for (let i = 0; i < targetIds.length; i += 10) chunks.push(targetIds.slice(i, i + 10));

        for (const c of chunks) {
          const snap = await getDocs(query(intentsCol, where(documentId(), "in", c)));
          intents.push(...snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        }
      } else {
        // 기존 로직(최근수정=needsEmbedding=true, 전체=전체)
        const qs: QueryConstraint[] = [];
        if (targetType === "intent") qs.push(where("needsEmbedding", "==", true));
        qs.push(orderBy("updatedAt", "desc"));
        qs.push(limit(500));
        const snap = await getDocs(query(intentsCol, ...qs));
        intents = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      }
      await log(jobId, `인텐트 ${intents.length}개 로드`);
    }

    // ----------------------------
    // entities 로드
    // ----------------------------
    if (targetType === "project" || targetType === "entity") {
      if (Array.isArray(targetIds) && targetIds.length > 0 && targetType === "entity") {
        const chunks: string[][] = [];
        for (let i = 0; i < targetIds.length; i += 10) chunks.push(targetIds.slice(i, i + 10));

        for (const c of chunks) {
          const snap = await getDocs(query(entitiesCol, where(documentId(), "in", c)));
          entities.push(...snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        }
      } else {
        const qs: QueryConstraint[] = [];
        if (targetType === "entity") qs.push(where("needsEmbedding", "==", true));
        qs.push(orderBy("updatedAt", "desc"));
        qs.push(limit(500));
        const snap = await getDocs(query(entitiesCol, ...qs));
        entities = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      }
      await log(jobId, `엔티티 ${entities.length}개 로드`);
    }

    // 임베딩 업데이트: Gemini embedText()로 생성
    let intentsOk = 0;
    for (const intent of intents) {
      const text = buildIntentText(intent);
      if (!text) continue;

      const emb = await embedWithRetry(jobId, text, 3);

      await updateDoc(doc(db, ROOT, projectId, "intents", intent.id), {
        embedding: emb.values,
        embeddingVersion: 1,
        embeddingModel: emb.model,
        embeddingDim: emb.dim,
        needsEmbedding: false,
        embeddingUpdatedAt: serverTimestamp(),
      });

      intentsOk++;
      if (intentsOk % 20 === 0) await log(jobId, `인텐트 임베딩 진행중... (${intentsOk}/${intents.length})`);
    }
    if (intents.length) await log(jobId, `인텐트 임베딩 완료 (${intentsOk}/${intents.length})`);

    let entitiesOk = 0;
    for (const entity of entities) {
      const text = buildEntityText(entity);
      if (!text) continue;

      const emb = await embedWithRetry(jobId, text, 3);

      await updateDoc(doc(db, ROOT, projectId, "entities", entity.id), {
        embedding: emb.values,
        embeddingVersion: 1,
        embeddingModel: emb.model,
        embeddingDim: emb.dim,
        needsEmbedding: false,
        embeddingUpdatedAt: serverTimestamp(),
      });

      entitiesOk++;
      if (entitiesOk % 20 === 0) await log(jobId, `엔티티 임베딩 진행중... (${entitiesOk}/${entities.length})`);
    }
    if (entities.length) await log(jobId, `엔티티 임베딩 완료 (${entitiesOk}/${entities.length})`);

    await updateDoc(jobRef, {
      status: "success",
      finishedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
      message: "학습 완료",
    });
    await log(jobId, "학습 완료");

    return NextResponse.json({
      ok: true,
      summary: { intentsProcessed: intents.length, entitiesProcessed: entities.length },
    });
  } catch (e: any) {
    console.error("train error:", e);

    const jobId = body?.jobId;
    if (jobId) {
      try {
        await updateDoc(doc(db, "train_jobs", jobId), {
          status: "failed",
          finishedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
          message: e?.message ?? "train error",
        });
        await log(jobId, e?.message ?? "학습 중 오류 발생", "error");
      } catch {}
    }

    return NextResponse.json({ ok: false, message: e?.message ?? "train error" }, { status: 500 });
  }
}
