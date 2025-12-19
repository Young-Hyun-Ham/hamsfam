// app/api/admin/firebase/train/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  QueryConstraint,
} from "firebase/firestore";

const ALLOWED_STATUS = new Set(["running", "success", "failed"]);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const projectId = url.searchParams.get("projectId");
    const status = url.searchParams.get("status");
    const pageSize = Math.min(
      Number(url.searchParams.get("limit") ?? 20),
      50
    );

    const colRef = collection(db, "train_jobs");
    const qs: QueryConstraint[] = [];

    if (projectId) qs.push(where("projectId", "==", projectId));
    if (status && ALLOWED_STATUS.has(status)) {
      qs.push(where("status", "==", status));
    }

    qs.push(orderBy("createdAt", "desc"));
    qs.push(limit(pageSize));

    const snap = await getDocs(query(colRef, ...qs));

    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("train jobs error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "jobs error" },
      { status: 500 }
    );
  }
}
