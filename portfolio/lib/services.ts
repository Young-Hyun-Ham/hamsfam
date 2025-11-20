// lib/menuService.ts
import { db } from "@/lib/postgresql";
import { adminDb } from "@/lib/firebaseAdmin";
import { MenuType } from "@/app/api/types/types";

async function getMenusFromPostgres(): Promise<MenuType[]> {
  const result = await db.query(`
    SELECT id, menu_id, label, href, "order", lev, up_id,
           "createdAt", "updatedAt"
    FROM public.menu
    WHERE lev = 1
    ORDER BY "order" ASC NULLS LAST, "createdAt" ASC
  `);

  return result.rows as MenuType[];
}

async function getMenusFromFirebase(): Promise<MenuType[]> {
  const snap = await adminDb
    .collection("menu")
    .where("lev", "==", 1)
    .orderBy("order", "asc")
    .get();

  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
      } as unknown as MenuType)
  );
}

export async function getMenusByBackend(
  backend: "postgres" | "firebase"
): Promise<MenuType[]> {
  if (backend === "firebase") return getMenusFromFirebase();
  return getMenusFromPostgres();
}


async function getSubMenusFromPostgres(up_menu_id: string): Promise<MenuType[]> {
  const result = await db.query(
    `
    WITH RECURSIVE menu_tree AS (
      SELECT
        m.id,
        m.menu_id,
        m.label,
        m.href,
        m."order",
        m.lev,
        m.up_id,
        0 AS depth,
        m.menu_id::text AS path_ids,
        m.label::text AS path_labels
      FROM public.menu AS m
      WHERE m.menu_id = $1

      UNION ALL

      SELECT
        c.id,
        c.menu_id,
        c.label,
        c.href,
        c."order",
        c.lev,
        c.up_id,
        mt.depth + 1 AS depth,
        (mt.path_ids   || '>' || COALESCE(c.menu_id, '')) AS path_ids,
        (mt.path_labels || '>' || COALESCE(c.label, ''))  AS path_labels
      FROM public.menu AS c
      JOIN menu_tree AS mt
        ON c.up_id = mt.id
    )
    SELECT
      id,
      menu_id,
      label,
      href,
      "order",
      lev,
      up_id,
      depth,
      path_ids,
      path_labels
    FROM menu_tree
    WHERE depth >= 1
    ORDER BY
      depth ASC,
      "order" ASC NULLS LAST,
      label ASC;
    `,
    [up_menu_id],
  );

  return result.rows as MenuType[];
}

async function getSubMenusFromFirebase(up_menu_id: string): Promise<MenuType[]> {
  try {
      // 1) 루트: menu_id == last
      const rootSnap = await adminDb
        .collection("menu")
        .where("menu_id", "==", up_menu_id)
        .get();
  
      if (rootSnap.empty) {
        // 해당 루트가 없으면 하위도 없음
        return [];
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
  
      return items;
    } catch (err) {
      console.error("[submenus][GET][firebase]", err);
      return [];
    }
}

export async function getSubMenusByBackend(
  backend: "postgres" | "firebase",
  up_menu_id: string,
): Promise<MenuType[]> {
  if (backend === "firebase") return getSubMenusFromFirebase(up_menu_id);
  return getSubMenusFromPostgres(up_menu_id);
}