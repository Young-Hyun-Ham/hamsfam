// app/api/board/firebase/board/_utils.ts
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

export function normalize(v: any) {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

export function tokenizeForSearch(title: string, content: string, tags: string[]) {
  const text = `${normalize(title)} ${normalize(content)} ${(tags ?? []).join(" ")}`.toLowerCase();
  // 아주 단순 토큰화(MVP): 한글/영문/숫자 덩어리 분리
  const tokens = Array.from(
    new Set(
      text
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .slice(0, 30)
    )
  );
  return tokens;
}

export async function getCategoryPerm(slug: string) {
  const colRef = collection(db, "board_categories");
  const snap = await getDocs(query(colRef, where("slug", "==", slug), limit(1)));
  
  if (snap.empty) return null;

  const d = snap.docs[0];
  const data = d.data() as any;

  return {
    id: d.id, // 실제 문서 ID (랜덤)
    slug: data.slug ?? slug,
    name: data.name ?? slug,
    edit: Boolean(data.edit),
    reply: Boolean(data.reply),
    status: data.status,
    order: data.order,
    description: data.description,
  };
}
