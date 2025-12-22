import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

const COL = "knowledge_projects";
const JOB_COL = "train_jobs";

type LastTrain = {
  jobId: string;
  status: "queued" | "running" | "success" | "failed" | string;
  targetType?: string;
  targetSummary?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
  message?: string;
};

type KnowledgeCounts = {
  intents: { total: number; untrained: number };
  entities: { total: number; untrained: number };
  knowledge: { total: number; untrained: number }; // intents+entities
};

export async function GET() {
  // 1) 프로젝트 목록
  const snap = await adminDb.collection(COL).orderBy("createdAt", "desc").get();
  const projects = snap.docs.map((d) => d.data() as any);

  // 2) 프로젝트별 lastTrain + counts 조회(병렬)
  const items = await Promise.all(
    projects.map(async (p) => {
      const projectId = p.id;
      if (!projectId) {
        return {
          ...p,
          lastTrain: null as LastTrain | null,
          counts: {
            intents: { total: 0, untrained: 0 },
            entities: { total: 0, untrained: 0 },
            knowledge: { total: 0, untrained: 0 },
          } satisfies KnowledgeCounts,
        };
      }

      // -------------------------
      // A) lastTrain (최신 1건)
      // -------------------------
      let lastTrain: LastTrain | null = null;

      const jobSnap = await adminDb
        .collection(JOB_COL)
        .where("projectId", "==", projectId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!jobSnap.empty) {
        const jobDoc = jobSnap.docs[0];
        const job = jobDoc.data() as any;

        lastTrain = {
          jobId: jobDoc.id,
          status: job.status,
          targetType: job.targetType,
          targetSummary: job.targetSummary,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
          updatedAt: job.updatedAt,
          message: job.message,
        };
      }

      // -------------------------
      // B) counts (intents/entities 총합 + 미학습)
      // -------------------------
      const intentsRef = adminDb.collection(COL).doc(projectId).collection("intents");
      const entitiesRef = adminDb.collection(COL).doc(projectId).collection("entities");

      // total
      const [intentsAll, entitiesAll] = await Promise.all([
        intentsRef.get(),
        entitiesRef.get(),
      ]);

      // untrained(needsEmbedding=true)
      const [intentsUntrained, entitiesUntrained] = await Promise.all([
        intentsRef.where("needsEmbedding", "==", true).get(),
        entitiesRef.where("needsEmbedding", "==", true).get(),
      ]);

      const intentsTotal = intentsAll.size;
      const entitiesTotal = entitiesAll.size;
      const intentsU = intentsUntrained.size;
      const entitiesU = entitiesUntrained.size;

      const counts: KnowledgeCounts = {
        intents: { total: intentsTotal, untrained: intentsU },
        entities: { total: entitiesTotal, untrained: entitiesU },
        knowledge: { total: intentsTotal + entitiesTotal, untrained: intentsU + entitiesU },
      };

      return { ...p, lastTrain, counts };
    })
  );

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const description =
    body?.description != null ? String(body.description).trim() : undefined;

  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  const doc = {
    id,
    name,
    description,
    defaultLanguage: body?.defaultLanguage ?? "ko-KR",
    status: body?.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };

  await adminDb.collection(COL).doc(id).set(doc);

  // 새로 만든 프로젝트는 lastTrain 없음 + counts 0
  return NextResponse.json(
    {
      ...doc,
      lastTrain: null,
      counts: {
        intents: { total: 0, untrained: 0 },
        entities: { total: 0, untrained: 0 },
        knowledge: { total: 0, untrained: 0 },
      },
    },
    { status: 201 }
  );
}
