// app/api/menus/route.ts
import { MenuType } from "@/app/api/types/types";
import { NextResponse } from "next/server";
// import { prisma } from "@/lib/db";  // 너의 DB 클라이언트
import { adminDb } from "@/lib/firebaseAdmin";

// Node 런타임 고정(Edge에서 firebase-admin 사용 불가)
export const runtime = "nodejs";
// 캐시 막고 항상 최신
export const dynamic = "force-dynamic";

/**
 * @summary lev1 on menu
 * @description 최상단 메뉴를 가져오기
 * @tag menus
 */
export async function GET() {
  // 실제 구현 예시 (Prisma일 때)
  // const rows = await prisma.menu.findMany({
  //   select: { id: true, name: true, path: true, order: true },
  //   orderBy: { order: "asc" },
  // });
  // const items = rows.map(r => ({ id: String(r.id), label: r.name, href: r.path, order: r.order ?? 0 }));
  
  const snap = await adminDb
    .collection("menu")
    .where("lev", "==", 1)
    .orderBy("order", "asc") // 정렬 원하면 추가(lev==1 + orderBy는 보통 인덱스 불필요)
    .get();

  const items = snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
      } as unknown as MenuType)
  );

  // 데모 데이터 (DB 붙기 전 임시)
  // const items: MenuType[] = [
  //   { id: "main", menu_id: "main", label: "Main", href: "/main", order: 1, lev: 1, up_id: "" },
  //   { id: "chat", menu_id: "chat", label: "Chat", href: "/chat", order: 2, lev: 1, up_id: "" },
  //   { id: "mcpChat", menu_id: "mcpChat", label: "mcpChat", href: "/chatSample", order: 2, lev: 1, up_id: "" },
  //   { id: "scenario", menu_id: "scenario", label: "Builder", href: "/builder", order: 3, lev: 1, up_id: "" },
  //   { id: "admin", menu_id: "admin", label: "Admin", href: "/admin", order: 4, lev: 1, up_id: "" },
  // ];

  return NextResponse.json({ items });
}
