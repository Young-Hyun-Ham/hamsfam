// app/api/admin/firebase/train/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const COL = "knowledge_projects";

type TargetType = "intent" | "entity";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") ?? "";
    const targetType = (url.searchParams.get("targetType") ?? "") as TargetType;
    const onlyNeeds = (url.searchParams.get("onlyNeeds") ?? "true") === "true";
    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

    if (!projectId) {
      return NextResponse.json({ ok: false, message: "projectId is required" }, { status: 400 });
    }
    if (targetType !== "intent" && targetType !== "entity") {
      return NextResponse.json({ ok: false, message: "targetType must be intent|entity" }, { status: 400 });
    }

    const sub = targetType === "intent" ? "intents" : "entities";
    let q = adminDb.collection(COL).doc(projectId).collection(sub).orderBy("updatedAt", "desc").limit(pageSize);

    if (onlyNeeds) q = q.where("needsEmbedding", "==", true) as any;

    const snap = await q.get();

    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: data.name ?? "",
        description: data.description ?? "",
        updatedAt: data.updatedAt ?? data.createdAt ?? null,
        needsEmbedding: Boolean(data.needsEmbedding),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("train preview error:", e);
    return NextResponse.json({ ok: false, message: e?.message ?? "preview error" }, { status: 500 });
  }
}
