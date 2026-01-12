// app/api/admin/firebase/knowledge/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type Params = { params: Promise<{ projectId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { projectId } = await params;
  const body = await req.json();
  
  const patch: any = {
    updatedAt: new Date().toISOString(),
  };
  
  if (body?.name != null) patch.name = String(body.name).trim();
  if (body?.description != null) patch.description = String(body.description).trim();
  if (body?.defaultLanguage != null) patch.defaultLanguage = String(body.defaultLanguage).trim();
  if (body?.intentThreshold != null) patch.intentThreshold = body.intentThreshold;
  if (body?.status != null) patch.status = String(body.status).trim();

  const ref = adminDb
    .collection("knowledge_projects")
    .doc(projectId);

  await ref.set(patch, { merge: true });
  
  const after = await ref.get();
  return NextResponse.json(after.data());
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ message: "projectId is required" }, { status: 400 });
  }

  // ✅ 프로젝트 삭제 - 하위 컬렉션 까지 전부 삭제
  await adminDb.recursiveDelete(
    adminDb.collection("knowledge_projects").doc(projectId)
  );
  return NextResponse.json({ ok: true });
}
