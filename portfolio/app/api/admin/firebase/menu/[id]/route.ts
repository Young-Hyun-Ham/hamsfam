// app/api/firebase/admin/menu/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type MenuPartial = {
  menu_id?: string;
  label?: string;
  href?: string | null;
  order?: number | null;
  lev?: number;
  up_id?: string | null;
  use_yn?: "Y" | "N";
};

const colRef = adminDb.collection("menu");

type Params = {
  params: Promise<{ id: string }>;
};

/** PATCH: 메뉴 수정 + 순번 재조정 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const raw = await req.json();

    // 들어온 값 강제 정규화 (특히 order / lev)
    const payload: MenuPartial = {
      ...raw,
      order:
        raw?.order === undefined || raw?.order === null
          ? undefined
          : Number(raw.order),
      lev:
        raw?.lev === undefined || raw?.lev === null ? undefined : Number(raw.lev),
      up_id:
        raw?.up_id === undefined || raw?.up_id === "" ? null : raw.up_id,
    };

    const ref = colRef.doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "해당 메뉴가 존재하지 않습니다." },
        { status: 404 }
      );
    }

    const current = snap.data() as any;

    // 기존 값도 타입 정규화
    const oldLev: number = Number(current.lev ?? 1);
    const oldUpId: string | null =
      current.up_id === undefined || current.up_id === ""
        ? null
        : (current.up_id as string);
    const oldOrderValue =
      current.order === undefined || current.order === null
        ? null
        : Number(current.order);
    const oldOrder: number | null =
      oldOrderValue !== null && !Number.isNaN(oldOrderValue)
        ? oldOrderValue
        : null;

    const newLev: number = payload.lev ?? oldLev;
    const newUpId: string | null =
      payload.up_id === undefined ? oldUpId : payload.up_id;
    const newOrderValue =
      payload.order === undefined || payload.order === null
        ? oldOrder
        : Number(payload.order);
    let newOrder: number | null =
      newOrderValue !== null && !Number.isNaN(newOrderValue)
        ? newOrderValue
        : oldOrder;

    const batch = adminDb.batch();
    const isGroupChanged = newLev !== oldLev || newUpId !== oldUpId;

    // 1) 그룹이 바뀐 경우 (lev or up_id 변경)
    if (isGroupChanged) {
      // 1-1) 기존 그룹에서 hole 메우기: oldOrder 보다 큰 애들 -1
      if (oldOrder != null) {
        let oldGroupQuery = colRef.where("lev", "==", oldLev);

        if (oldUpId) {
          oldGroupQuery = oldGroupQuery.where("up_id", "==", oldUpId);
        } else {
          oldGroupQuery = oldGroupQuery.where("up_id", "==", null);
        }

        oldGroupQuery = oldGroupQuery.where("order", ">", oldOrder);

        const oldSnap = await oldGroupQuery.get();
        oldSnap.forEach((d) => {
          const curOrderRaw = d.data().order;
          const curOrder =
            curOrderRaw === undefined || curOrderRaw === null
              ? 0
              : Number(curOrderRaw) || 0;
          batch.update(d.ref, { order: curOrder - 1 });
        });
      }

      // 1-2) 새 그룹에 끼워 넣기
      let newGroupQuery = colRef.where("lev", "==", newLev);

      if (newUpId) {
        newGroupQuery = newGroupQuery.where("up_id", "==", newUpId);
      } else {
        newGroupQuery = newGroupQuery.where("up_id", "==", null);
      }

      newGroupQuery = newGroupQuery.orderBy("order", "asc");
      const newSnap = await newGroupQuery.get();

      const size = newSnap.size;
      if (
        newOrder == null ||
        typeof newOrder !== "number" ||
        Number.isNaN(newOrder) ||
        newOrder <= 0 ||
        newOrder > size + 1
      ) {
        newOrder = size + 1;
      } else {
        newSnap.forEach((d) => {
          const curOrderRaw = d.data().order;
          const curOrder =
            curOrderRaw === undefined || curOrderRaw === null
              ? 0
              : Number(curOrderRaw) || 0;
          if (curOrder >= (newOrder as number)) {
            batch.update(d.ref, { order: curOrder + 1 });
          }
        });
      }
    }
    // 2) 그룹은 그대로인데 order만 바뀌는 경우
    else if (
      newOrder != null &&
      oldOrder != null &&
      !Number.isNaN(newOrder) &&
      newOrder !== oldOrder
    ) {
      const from = oldOrder;
      const to = newOrder;

      let sameGroupQuery = colRef.where("lev", "==", oldLev);

      if (oldUpId) {
        sameGroupQuery = sameGroupQuery.where("up_id", "==", oldUpId);
      } else {
        sameGroupQuery = sameGroupQuery.where("up_id", "==", null);
      }

      sameGroupQuery = sameGroupQuery
        .where("order", ">=", Math.min(from, to))
        .where("order", "<=", Math.max(from, to))
        .orderBy("order", "asc");

      const sameGroupSnap = await sameGroupQuery.get();

      sameGroupSnap.forEach((d) => {
        if (d.id === id) return;

        const curOrderRaw = d.data().order;
        const curOrder =
          curOrderRaw === undefined || curOrderRaw === null
            ? 0
            : Number(curOrderRaw) || 0;

        // 위로 올리는 경우: 사이 구간 +1
        if (to < from && curOrder >= to && curOrder < from) {
          batch.update(d.ref, { order: curOrder + 1 });
        }
        // 아래로 내리는 경우: 사이 구간 -1
        else if (to > from && curOrder <= to && curOrder > from) {
          batch.update(d.ref, { order: curOrder - 1 });
        }
      });
    }

    // 3) 자기 자신 업데이트
    batch.update(ref, {
      ...payload,
      lev: newLev,
      up_id: newUpId,
      order: newOrder,
      updatedAt: new Date(),
    });

    await batch.commit();

    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    console.error(`PATCH /api/firebase/admin/menu/${id} error:`, err);
    return NextResponse.json(
      { error: "메뉴 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/** DELETE: 메뉴 삭제 + 뒤에 있는 순번 당기기 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const ref = colRef.doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "해당 메뉴가 존재하지 않습니다." },
        { status: 404 }
      );
    }

    const current = snap.data() as any;
    const lev: number = Number(current.lev ?? 1);
    const upId: string | null =
      current.up_id === undefined || current.up_id === ""
        ? null
        : (current.up_id as string);
    const orderValue =
      current.order === undefined || current.order === null
        ? null
        : Number(current.order);
    const order: number | null =
      orderValue !== null && !Number.isNaN(orderValue) ? orderValue : null;

    const batch = adminDb.batch();

    // 1) 같은 그룹에서 order > 삭제된 메뉴의 order 인 애들 -1
    if (order != null) {
      let groupQuery = colRef.where("lev", "==", lev);

      if (upId) {
        groupQuery = groupQuery.where("up_id", "==", upId);
      } else {
        groupQuery = groupQuery.where("up_id", "==", null);
      }

      groupQuery = groupQuery.where("order", ">", order);

      const groupSnap = await groupQuery.get();

      groupSnap.forEach((d) => {
        const curOrderRaw = d.data().order;
        const curOrder =
          curOrderRaw === undefined || curOrderRaw === null
            ? 0
            : Number(curOrderRaw) || 0;
        batch.update(d.ref, { order: curOrder - 1 });
      });
    }

    // 2) 자기 자신 삭제
    batch.delete(ref);

    await batch.commit();

    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/firebase/admin/menu/${id} error:`, err);
    return NextResponse.json(
      { error: "메뉴 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
