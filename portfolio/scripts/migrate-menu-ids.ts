// scripts/migrate-menu-ids.ts
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { adminDb } from "../lib/firebaseAdmin";

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

async function migrateMenuIds() {
  const colRef = adminDb.collection("menu");

  // 1) 전체 문서 조회
  const snap = await colRef.get();
  console.log("총 메뉴 개수:", snap.size);

  // 2) oldId -> newId(uuid) 매핑 생성
  const idMap = new Map<string, string>();
  snap.forEach((doc) => {
    const oldId = doc.id;
    const newId = uuidv4();
    idMap.set(oldId, newId);
  });

  // 3) 새 문서 생성 + up_id 재매핑 + 기존 문서 삭제
  let batch = adminDb.batch();
  let opCount = 0;

  for (const doc of snap.docs) {
    const oldId = doc.id;
    const data = doc.data() as MenuDoc;

    const newId = idMap.get(oldId)!;
    const newRef = colRef.doc(newId);

    let newUpId: string | null = null;
    if (data.up_id) {
      // 부모도 id가 바뀌었으면 새 id로 교체
      newUpId = idMap.get(data.up_id) ?? data.up_id;
    }

    batch.set(newRef, {
      ...data,
      id: newId,        // 문서 안에도 id 필드 저장
      up_id: newUpId,
      updatedAt: new Date(),
    });

    batch.delete(doc.ref);
    opCount += 2;

    // Firestore batch limit 대비: 400ops 단위로 커밋
    if (opCount >= 400) {
      await batch.commit();
      console.log("중간 커밋 완료 (약 400 operations)");
      batch = adminDb.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log("🎉 메뉴 문서 ID 마이그레이션 완료!");
}

migrateMenuIds()
  .then(() => {
    console.log("DONE");
    process.exit(0);
  })
  .catch((err) => {
    console.error("마이그레이션 중 오류:", err);
    process.exit(1);
  });
