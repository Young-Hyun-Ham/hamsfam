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

const EMBEDDING_DIM = 8;
function mockEmbedding(text: string) {
  const v = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) v[i % EMBEDDING_DIM] += text.charCodeAt(i) % 97;
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => Number((x / norm).toFixed(6)));
}

async function log(jobId: string, message: string, level: "info" | "error" = "info") {
  await addDoc(collection(db, "train_jobs", jobId, "logs"), {
    level,
    message,
    createdAt: serverTimestamp(),
  });
}

// ✅ 실제 DB 루트 컬렉션명
const ROOT = "knowledge_projects";

type TargetType = "project" | "intent" | "entity";

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

    // ✅ job 문서 없으면 생성
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

    // ✅ 프로젝트 존재 확인(디버깅 도움)
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
    // ✅ intents 로드
    // - project: 전체 로드 (불필요한 where("__name__","!=","") 제거)
    // - intent: needsEmbedding=true 만 로드
    // ----------------------------
    if (targetType === "project" || targetType === "intent") {
      if (Array.isArray(targetIds) && targetIds.length > 0 && targetType === "intent") {
        // ✅ 선택된 ID만 학습
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
    // ✅ entities 로드
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

    // ✅ 임베딩 업데이트 (경로 ROOT로 통일)
    for (const intent of intents) {
      const text = `${intent.name ?? ""} ${intent.description ?? ""}`.trim();
      const embedding = mockEmbedding(text);
      await updateDoc(doc(db, ROOT, projectId, "intents", intent.id), {
        embedding,
        embeddingVersion: 1,
        needsEmbedding: false,
        updatedAt: serverTimestamp(),
      });
    }
    if (intents.length) await log(jobId, `인텐트 임베딩 완료 (${intents.length})`);

    for (const entity of entities) {
      const valuesText = Array.isArray(entity.values) ? entity.values.join(" ") : "";
      const text = `${entity.name ?? ""} ${valuesText}`.trim();
      const embedding = mockEmbedding(text);
      await updateDoc(doc(db, ROOT, projectId, "entities", entity.id), {
        embedding,
        embeddingVersion: 1,
        needsEmbedding: false,
        updatedAt: serverTimestamp(),
      });
    }
    if (entities.length) await log(jobId, `엔티티 임베딩 완료 (${entities.length})`);

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
