import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
type Params = { params: Promise<{ projectId: string; entityId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { projectId, entityId } = await params;
  const ref = adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("entities")
    .doc(entityId);

  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(snap.data());
}

export async function PATCH(req: Request, { params }: Params) {
  const { projectId, entityId } = await params;
  const body = await req.json();

  const patch: any = { updatedAt: new Date().toISOString() };

  if (body?.name != null) patch.name = String(body.name).trim();
  if (body?.displayName != null) patch.displayName = String(body.displayName).trim();
  if (body?.description != null) patch.description = String(body.description);

  if (body?.values != null) {
    patch.values = Array.isArray(body.values)
      ? body.values.map((v: any) => ({
          value: String(v?.value ?? "").trim(),
          synonyms: Array.isArray(v?.synonyms)
            ? v.synonyms.map((s: any) => String(s).trim()).filter(Boolean)
            : [],
        }))
      : [];
  }

  const ref = adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("entities")
    .doc(entityId);

  await ref.set(patch, { merge: true });
  const after = await ref.get();

  return NextResponse.json(after.data());
}

export async function DELETE(_req: Request, { params }: Params) {
  const { projectId, entityId } = await params;

  await adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("entities")
    .doc(entityId)
    .delete();

  return NextResponse.json({ ok: true });
}
