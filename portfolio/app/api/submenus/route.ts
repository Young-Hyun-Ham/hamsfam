// app/api/submenus/route.ts
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import type { MenuType } from "../types/types";

/**
 * @summary submenu
 * @description 서브 메뉴를 가져오기 (Firestore)
 * @tag menus
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const last = url.searchParams.get("up_menu") ?? "";
    if (!last) return NextResponse.json({ items: [] });

    // 1) 루트: menu_id == last
    const rootSnap = await adminDb
      .collection("menu")
      .where("menu_id", "==", last)
      .get();

    if (rootSnap.empty) {
      // 해당 루트가 없으면 하위도 없음
      return NextResponse.json({ items: [] });
    }

    type Node = MenuType & {
      depth: number;
      path_ids: string;
      path_labels: string;
    };

    const toNode = (doc: FirebaseFirestore.QueryDocumentSnapshot, base?: Partial<Node>): Node => {
      const data = doc.data() as Omit<MenuType, "id">;
      const id = doc.id;
      return {
        id,
        menu_id: data.menu_id ?? "",
        label: data.label ?? "",
        href: data.href ?? "",
        order: data.order,
        lev: data.lev ?? 0,
        up_id: data.up_id ?? "",
        depth: base?.depth ?? 0,
        path_ids: base?.path_ids ?? (data.menu_id ?? ""),
        path_labels: base?.path_labels ?? (data.label ?? ""),
      };
    };

    // 루트 노드들 (depth=0, path는 자기 자신으로 시작)
    const roots: Node[] = rootSnap.docs.map((d) =>
      toNode(d, {
        depth: 0,
        path_ids: (d.data() as any).menu_id ?? "",
        path_labels: (d.data() as any).label ?? "",
      })
    );

    // 2) BFS로 하위 전부 수집
    const results: Node[] = []; // depth>=1만 모을 예정
    let currentLevel: Node[] = roots;

    // Firestore의 where("in")는 최대 10개까지 가능 → 10개 단위로 쿼리
    const chunk = <T,>(arr: T[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      );

    while (currentLevel.length > 0) {
      // 부모들의 id 모아 children where up_id in (parents)
      const parentIds = currentLevel.map((n) => n.id);
      const batches = chunk(parentIds, 10);

      const nextLevel: Node[] = [];
      for (const ids of batches) {
        const snap = await adminDb
          .collection("menu")
          .where("up_id", "in", ids)
          .get();

        snap.forEach((childDoc) => {
          const childData = childDoc.data() as Omit<MenuType, "id">;
          const parent = currentLevel.find((p) => p.id === childData.up_id);
          // 방어: parent가 없으면 depth 계산 불가 → 스킵
          if (!parent) return;

          const node = toNode(childDoc, {
            depth: parent.depth + 1,
            path_ids: `${parent.path_ids}>${childData.menu_id ?? ""}`,
            path_labels: `${parent.path_labels}>${childData.label ?? ""}`,
          });

          // depth>=1만 결과에 저장
          results.push(node);
          nextLevel.push(node);
        });
      }

      currentLevel = nextLevel;
    }

    // 3) 정렬: depth ASC, order NULLS LAST ASC, label ASC
    const sortWithNullsLast = (a?: number, b?: number) => {
      const hasA = a !== undefined && a !== null;
      const hasB = b !== undefined && b !== null;
      if (hasA && hasB) return (a as number) - (b as number);
      if (hasA && !hasB) return -1; // a 먼저
      if (!hasA && hasB) return 1;  // b 먼저
      return 0;
    };

    results.sort((a, b) => {
      // depth
      if (a.depth !== b.depth) return a.depth - b.depth;
      // order (NULLS LAST)
      const orderCmp = sortWithNullsLast(a.order, b.order);
      if (orderCmp !== 0) return orderCmp;
      // label
      return a.label.localeCompare(b.label, "ko");
    });

    // 4) 반환 형태 매핑 (href, order 등 방어)
    const items: MenuType[] = results.map((r) => ({
      id: String(r.id),
      menu_id: r.menu_id,
      label: r.label,
      href: r.href ?? "",
      order: r.order ?? 0,
      lev: r.lev,
      up_id: r.up_id ? String(r.up_id) : "",
      depth: r.depth,
      path_ids: r.path_ids,
      path_labels: r.path_labels,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[submenus][GET][firebase]", err);
    return NextResponse.json(
      { message: "서브메뉴 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}