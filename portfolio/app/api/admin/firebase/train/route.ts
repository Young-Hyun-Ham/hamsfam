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

export async function POST(req: NextRequest) {
  const startedAt = new Date().toISOString();
  let body: any = null;

  try {
    body = await req.json();
    const { jobId, projectId, projectName, targetType, triggeredBy } = body;

    if (!jobId || !projectId || !targetType) {
      return NextResponse.json({ ok: false, message: "invalid payload" }, { status: 400 });
    }

    const jobRef = doc(db, "train_jobs", jobId);
    const jobSnap = await getDoc(jobRef);

    // ✅ 없으면 생성하고 진행 (핵심)
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

    let intents: any[] = [];
    let entities: any[] = [];

    if (targetType === "project" || targetType === "intent") {
      const q = query(
        collection(db, "projects", projectId, "intents"),
        targetType === "intent" ? where("needsEmbedding", "==", true) : where("__name__", "!=", "")
      );
      const snap = await getDocs(q);
      intents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await log(jobId, `인텐트 ${intents.length}개 로드`);
    }

    if (targetType === "project" || targetType === "entity") {
      const q = query(
        collection(db, "projects", projectId, "entities"),
        targetType === "entity" ? where("needsEmbedding", "==", true) : where("__name__", "!=", "")
      );
      const snap = await getDocs(q);
      entities = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await log(jobId, `엔티티 ${entities.length}개 로드`);
    }

    for (const intent of intents) {
      const text = `${intent.name} ${intent.description ?? ""}`;
      const embedding = mockEmbedding(text);
      await updateDoc(doc(db, "projects", projectId, "intents", intent.id), {
        embedding,
        embeddingVersion: 1,
        needsEmbedding: false,
        updatedAt: serverTimestamp(),
      });
    }
    if (intents.length) await log(jobId, `인텐트 임베딩 완료 (${intents.length})`);

    for (const entity of entities) {
      const text = `${entity.name} ${entity.values?.join(" ") ?? ""}`;
      const embedding = mockEmbedding(text);
      await updateDoc(doc(db, "projects", projectId, "entities", entity.id), {
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
    });
    await log(jobId, "학습 완료");

    return NextResponse.json({
      ok: true,
      summary: { intentsProcessed: intents.length, entitiesProcessed: entities.length },
    });
  } catch (e: any) {
    console.error("train error:", e);

    // ✅ req.json() 재호출 금지, body에서 jobId 추출
    const jobId = body?.jobId;
    if (jobId) {
      try {
        await updateDoc(doc(db, "train_jobs", jobId), {
          status: "failed",
          finishedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
        await log(jobId, e?.message ?? "학습 중 오류 발생", "error");
      } catch {}
    }

    return NextResponse.json({ ok: false, message: e?.message ?? "train error" }, { status: 500 });
  }
}
