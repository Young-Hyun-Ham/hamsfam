import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";

type Params = { params: Promise<{ projectId: string; intentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { projectId, intentId } = await params;
  const ref = adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("intents")
    .doc(intentId);

  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(snap.data());
}

export async function PATCH(req: Request, { params }: Params) {
  const { projectId, intentId } = await params;
  const body = await req.json();

  const patch: any = {
    updatedAt: new Date().toISOString(),
  };

  if (body?.name != null) patch.name = String(body.name).trim();
  if (body?.displayName != null) patch.displayName = String(body.displayName).trim();
  if (body?.description != null) patch.description = String(body.description);
  if (body?.trainingPhrases != null) {
    patch.trainingPhrases = Array.isArray(body.trainingPhrases)
      ? body.trainingPhrases.map((x: any) => String(x))
      : [];
  }
  if (body?.isFallback != null) patch.isFallback = Boolean(body.isFallback);

  const ref = adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("intents")
    .doc(intentId);

  await ref.set(patch, { merge: true });

  const after = await ref.get();
  return NextResponse.json(after.data());
}

export async function DELETE(_req: Request, { params }: Params) {
  const { projectId, intentId } = await params;

  await adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("intents")
    .doc(intentId)
    .delete();

  return NextResponse.json({ ok: true });
}
