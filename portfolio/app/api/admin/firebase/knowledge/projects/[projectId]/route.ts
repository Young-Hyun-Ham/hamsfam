// app/api/admin/firebase/knowledge/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Params = { params: Promise<{ projectId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ message: "projectId is required" }, { status: 400 });
  }

  // ✅ 프로젝트 삭제
  await deleteDoc(doc(db, "knowledge_projects", projectId));

  // TODO(선택): intents/entities도 같이 삭제하려면 batch로 함께 처리(원하면 바로 붙여줌)

  return NextResponse.json({ ok: true });
}
