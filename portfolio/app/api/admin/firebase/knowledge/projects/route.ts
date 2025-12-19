import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { adminDb } from "@/lib/firebaseAdmin";

const COL = "knowledge_projects";
export async function GET() {
  const snap = await adminDb.collection(COL).orderBy("createdAt", "desc").get();
  const items = snap.docs.map((d) => d.data());
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
  return NextResponse.json(doc, { status: 201 });
}
