import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    if (!adminDb) {
      throw new Error("adminDb is undefined. Check firebaseAdmin init.");
    }

    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { message: "projectId is required (route params missing)" },
        { status: 400 }
      );
    }
    const url = new URL(req.url);
    const keyword = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

    // ✅ updatedAt이 없는 문서가 섞여 있으면 orderBy가 실패할 수 있음
    // → 1차: updatedAt desc 시도, 실패하면 createdAt desc로 fallback
    let snap;
    try {
      snap = await adminDb
        .collection("knowledge_projects")
        .doc(projectId)
        .collection("intents")
        .orderBy("updatedAt", "desc")
        .limit(limit)
        .get();
    } catch (e) {
      console.warn(
        "[INTENTS][GET] orderBy(updatedAt) failed. fallback to createdAt.",
        e
      );
      snap = await adminDb
        .collection("knowledge_projects")
        .doc(projectId)
        .collection("intents")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    }

    let items = snap.docs.map((d) => d.data());

    if (keyword) {
      items = items.filter((x: any) => {
        const name = String(x.name ?? "").toLowerCase();
        const displayName = String(x.displayName ?? "").toLowerCase();
        return name.includes(keyword) || displayName.includes(keyword);
      });
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[INTENTS][GET] error:", e?.message ?? e, e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    if (!adminDb) {
      throw new Error("adminDb is undefined. Check firebaseAdmin init.");
    }

    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { message: "projectId is required (route params missing)" },
        { status: 400 }
      );
    }
    
    let body: any = {};
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        body = await req.json();
      } catch (e) {
        console.warn("[INTENTS][POST] invalid JSON body", e);
        body = {};
      }
    } else {
      console.warn(
        "[INTENTS][POST] skipped req.json(), content-type =",
        contentType
      );
    }

    const name = String(body?.name ?? "").trim();
    const displayName = String(body?.displayName ?? "").trim();
    const scenarioKey = String(body?.scenarioKey ?? "").trim();
    const scenarioTitle = String(body?.scenarioTitle ?? "").trim();

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
      scenarioKey,
      scenarioTitle,
      trainingPhrases: Array.isArray(body?.trainingPhrases)
        ? body.trainingPhrases.map((x: any) => String(x))
        : [],
      isFallback: Boolean(body?.isFallback ?? false),
      createdAt: now,
      updatedAt: now,
    };

    const ref = adminDb
      .collection("knowledge_projects")
      .doc(projectId)
      .collection("intents")
      .doc(id);

    await ref.set(doc);

    // ✅ 저장 직후 상태를 확실히 반환(선택)
    const saved = await ref.get();
    return NextResponse.json(saved.data() ?? doc, { status: 201 });
  } catch (e: any) {
    console.error("[INTENTS][POST] error:", e?.message ?? e, e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
