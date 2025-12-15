// app/api/firebase/admin/menu/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type MenuDoc = {
  menu_id?: string;
  label?: string;
  href?: string | null;
  order?: number | null;
  lev?: number;
  up_id?: string | null;
  use_yn?: "Y" | "N";
  createdAt?: any;
  updatedAt?: any;
};

const colRef = adminDb.collection("menu");

/** GET: 메뉴 목록 조회 + path_labels / path_ids 구성 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const levParam = searchParams.get("lev");
    const searchText = searchParams.get("searchText") ?? "";

    // 🔹 lev 파라미터 파싱
    let levFilter: number | null = null;
    if (levParam !== null && levParam !== "") {
      const lv = Number(levParam);
      levFilter = Number.isNaN(lv) ? null : lv;
    }

    // 🔹 메인 목록 쿼리
    let queryRef: FirebaseFirestore.Query = colRef;
    if (levFilter !== null) {
      queryRef = queryRef.where("lev", "==", levFilter);
    }
    queryRef = queryRef.orderBy("order", "asc");

    const snap = await queryRef.get();

    // 🔹 path 구성을 위한 전체 메뉴 조회
    const fullSnap = await colRef.get();
    const fullList = fullSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as MenuDoc),
    }));

    const menuMap = new Map<string, MenuDoc & { id: string }>(
      fullList.map((m) => [m.id, m])
    );

    // id 기준으로 label, menu_id 체인 생성
    function buildPathChains(menuId: string): {
      pathLabels: string;
      pathIds: string;
    } {
      const labels: string[] = [];
      const ids: string[] = [];
      const visited = new Set<string>();

      let current = menuMap.get(menuId);

      while (current) {
        if (visited.has(current.id)) {
          // 순환 참조 방지
          console.warn(
            "[menu] 순환 참조 감지:",
            current.id,
            "up_id:",
            current.up_id
          );
          break;
        }
        visited.add(current.id);

        labels.push(current.label ?? "");
        ids.push(current.menu_id ?? "");

        const upId =
          current.up_id === undefined ||
          current.up_id === null ||
          current.up_id === ""
            ? null
            : (current.up_id as string);

        if (!upId) break;

        const parent = menuMap.get(upId);
        if (!parent) {
          // 부모 못 찾는 경우: 여기까지의 경로만 사용
          console.warn(
            "[menu] 부모 메뉴를 찾지 못함:",
            current.id,
            " up_id:",
            upId
          );
          break;
        }

        current = parent;
      }

      return {
        pathLabels: labels.reverse().join(" > "), // Admin > 사용자정보
        pathIds: ids.reverse().join(">"), // admin>user-info
      };
    }

    // 🔹 기본 목록 매핑
    let items = snap.docs.map((d) => {
      const data = d.data() as MenuDoc;

      const lev =
        data.lev === undefined || data.lev === null
          ? 1
          : Number(data.lev) || 1;
      const up_id =
        data.up_id === undefined || data.up_id === "" ? null : data.up_id;
      const order =
        data.order === undefined || data.order === null
          ? null
          : Number(data.order);

      const { pathLabels, pathIds } = buildPathChains(d.id);

      return {
        id: d.id,
        menu_id: data.menu_id ?? "",
        label: data.label ?? "",
        href: data.href ?? null,
        order,
        lev,
        up_id,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        use_yn: data.use_yn == null ? "Y" : data.use_yn,

        // 여기서 path_labels / path_ids 둘 다 생성
        path_labels: pathLabels,
        path_ids: pathIds,
      };
    });

    // 🔹 검색어 필터 (menu_id / label, 소문자 포함 검색)
    if (searchText && searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      items = items.filter((m) => {
        const menuId = (m.menu_id ?? "").toLowerCase();
        const label = (m.label ?? "").toLowerCase();
        return menuId.includes(keyword) || label.includes(keyword);
      });
    }

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("GET /api/firebase/admin/menu error:", err);
    return NextResponse.json(
      { error: "메뉴 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/** POST: 메뉴 생성 + 중간 삽입 시 순번 밀기 */
type MenuPayload = {
  id?: string;
  menu_id: string;
  label: string;
  href?: string | null;
  order?: number | null;
  lev: number;
  up_id?: string | null;
  use_yn?: "Y" | "N";
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MenuPayload;

    const lev = Number(body.lev);
    const up_id =
      body.up_id === undefined || body.up_id === "" ? null : body.up_id;

    // 같은 레벨 + 같은 부모 그룹
    let groupQuery: FirebaseFirestore.Query = colRef.where("lev", "==", lev);

    if (up_id) {
      groupQuery = groupQuery.where("up_id", "==", up_id);
    } else {
      groupQuery = groupQuery.where("up_id", "==", null);
    }

    groupQuery = groupQuery.orderBy("order", "asc");

    const groupSnap = await groupQuery.get();
    const batch = adminDb.batch();

    let newOrder =
      body.order === undefined || body.order === null
        ? null
        : Number(body.order);
    const size = groupSnap.size;

    if (
      newOrder == null ||
      Number.isNaN(newOrder) ||
      newOrder <= 0 ||
      newOrder > size + 1
    ) {
      newOrder = size + 1;
    } else {
      groupSnap.forEach((docSnap) => {
        const curOrderRaw = (docSnap.data() as any).order;
        const curOrder =
          curOrderRaw === undefined || curOrderRaw === null
            ? 0
            : Number(curOrderRaw) || 0;
        if (curOrder >= (newOrder as number)) {
          batch.update(docSnap.ref, { order: curOrder + 1 });
        }
      });
    }

    // label을 문서 ID로 사용 (기존 구조 유지)
    // const docRef = colRef.doc(body.label);
    // label 말고 uuid값 채택
    const newId = body.id || colRef.doc().id;
    const docRef = colRef.doc(newId);

    batch.set(docRef, {
      ...body,
      id: newId,
      lev,
      up_id,
      order: newOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await batch.commit();

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/firebase/admin/menu error:", err);
    return NextResponse.json(
      { error: "메뉴 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
