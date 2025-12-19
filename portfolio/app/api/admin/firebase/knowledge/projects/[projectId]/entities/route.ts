import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { adminDb } from "@/lib/firebaseAdmin";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params;
  const url = new URL(req.url);
  const keyword = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const snap = await adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("entities")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();

  let items = snap.docs.map((d) => d.data());

  if (keyword) {
    items = items.filter((x: any) => {
      const name = String(x.name ?? "").toLowerCase();
      const displayName = String(x.displayName ?? "").toLowerCase();
      return name.includes(keyword) || displayName.includes(keyword);
    });
  }

  return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: Params) {
  const { projectId } = await params;
  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const displayName = String(body?.displayName ?? "").trim();

  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  const doc = {
    id,
    projectId,
    name,
    displayName: displayName || name,
    description: body?.description ? String(body.description) : "",
    values: Array.isArray(body?.values)
      ? body.values.map((v: any) => ({
          value: String(v?.value ?? "").trim(),
          synonyms: Array.isArray(v?.synonyms)
            ? v.synonyms.map((s: any) => String(s).trim()).filter(Boolean)
            : [],
        }))
      : [],
    createdAt: now,
    updatedAt: now,
  };

  await adminDb
    .collection("knowledge_projects")
    .doc(projectId)
    .collection("entities")
    .doc(id)
    .set(doc);

  return NextResponse.json(doc, { status: 201 });
}
