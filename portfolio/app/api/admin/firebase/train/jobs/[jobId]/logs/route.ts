// app/api/admin/firebase/train/jobs/[jobId]/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";

type Ctx = { params: Promise<{ jobId: string }> | { jobId: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    // params unwrap
    const { jobId } =
      "then" in (ctx.params as any)
        ? await (ctx.params as Promise<{ jobId: string }>)
        : (ctx.params as { jobId: string });

    if (!jobId) {
      return NextResponse.json(
        { ok: false, message: "jobId is required" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

    // job 문서 존재 확인 (없으면 404로)
    const jobRef = doc(db, "train_jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) {
      // return NextResponse.json(
      //   { ok: false, message: "job not found", items: [] },
      //   { status: 404 }
      // );
      return NextResponse.json(
        { ok: true, pending: true, items: [] },
        { status: 200 }
      );
    }

    const colRef = collection(db, "train_jobs", jobId, "logs");
    const snap = await getDocs(
      query(colRef, orderBy("createdAt", "asc"), limit(pageSize))
    );

    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "logs error" },
      { status: 500 }
    );
  }
}
