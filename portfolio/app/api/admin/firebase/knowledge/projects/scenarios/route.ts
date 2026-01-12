// app/api/admin/firebase/scenarios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const projectId = url.searchParams.get("projectId");
    const qText = (url.searchParams.get("q") || "").trim().toLowerCase();
    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

    let ref = adminDb.collection("scenarios") as FirebaseFirestore.Query;

    // ✅ projectId 필터
    if (projectId) {
    //   ref = ref.where("projectId", "==", projectId);
    }

    // ✅ 정렬 + 제한
    ref = ref.orderBy("updatedAt", "desc").limit(pageSize);

    const snap = await ref.get();

    let items = snap.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        name: data.name ?? "",
        description: data.description ?? "",
        projectId: data.projectId ?? null,
        created_at: data.created_at ?? null,
        updated_at: data.updated_at ?? null,
      };
    });

    /**
     * 🔎 Admin SDK에서도 "contains" 검색은 없음
     * → 서버 메모리에서 includes 필터 (현재 요구사항 기준 OK)
     */
    if (qText) {
      items = items.filter((x) => {
        const hay = `${x.id} ${x.name} ${x.description}`.toLowerCase();
        return hay.includes(qText);
      });
    }

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[scenarios GET]", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch scenarios" },
      { status: 500 }
    );
  }
}
