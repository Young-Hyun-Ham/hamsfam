// app/api/board/firebase/board/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDoc,
  doc,
  Timestamp,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  QueryConstraint,
} from "firebase/firestore";
import { tokenizeForSearch, getCategoryPerm, normalize } from "./_utils";
import { toDateTimeString } from "@/lib/utils/Utils";

const MAX_LIMIT = 50;

function deny(message: string, status = 403) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = normalize(url.searchParams.get("slug"));
    if (!slug) return NextResponse.json({ ok: false, message: "slug is required" }, { status: 400 });

    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });

    // (선택) 비공개 카테고리는 읽기 차단하고 싶으면 여기서 처리
    // if (perm.status && perm.status !== "published") return deny("category is not published", 403);

    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 20), MAX_LIMIT);
    const cursorId = normalize(url.searchParams.get("cursorId"));
    const keyword = normalize(url.searchParams.get("keyword")).toLowerCase();

    const colRef = collection(db, "board_posts");
    const qs: QueryConstraint[] = [
      where("slug", "==", slug),
      orderBy("createdAt", "desc"),
      limit(pageSize + 1),
    ];

    // cursor 적용
    if (cursorId) {
      const lastRef = doc(db, "board_posts", cursorId);
      const lastSnap = await getDoc(lastRef);
      if (lastSnap.exists()) qs.splice(2, 0, startAfter(lastSnap)); // orderBy 다음 위치에 startAfter
    }

    const snap = await getDocs(query(colRef, ...qs));
    let rows = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        createdAt: toDateTimeString(data.createdAt),
        updatedAt: toDateTimeString(data.updatedAt),
      };
    });

    // keyword는 MVP로 tokens array-contains-any를 이미 쓰고 있으면 그 방식 유지
    // (네 코드에 tokenizeForSearch가 있어서, 저장 시 tokens를 넣는 전제)
    if (keyword) {
      rows = rows.filter((r) => {
        const hay = `${r.title ?? ""} ${r.content ?? ""} ${(r.tags ?? []).join(" ")}`.toLowerCase();
        return hay.includes(keyword);
      });
    }

    const hasMore = rows.length > pageSize;
    const items = rows.slice(0, pageSize);

    const nextCursorId = hasMore ? items[items.length - 1]?.id ?? null : null;

    return NextResponse.json({
      ok: true,
      category: {
        slug: perm.slug,
        name: perm.name,
        edit: Boolean(perm.edit),
        reply: Boolean(perm.reply),
      },
      items,
      pageInfo: { limit: pageSize, nextCursorId, hasMore },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "GET failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = normalize(body.slug);
    if (!slug) return NextResponse.json({ ok: false, message: "slug is required" }, { status: 400 });

    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });
    if (!perm.edit) return deny("no permission to write");

    const title = normalize(body.title);
    const content = normalize(body.content);
    const tags = Array.isArray(body.tags) ? body.tags.map((t: any) => normalize(t)).filter(Boolean) : [];
    const status = normalize(body.status) || "published";
    const authorId = normalize(body.authorId) || null;
    const authorName = normalize(body.authorName) || "익명";

    if (!title) return NextResponse.json({ ok: false, message: "title is required" }, { status: 400 });

    const tokens = tokenizeForSearch(title, content, tags);

    const ref = await addDoc(collection(db, "board_posts"), {
      slug,
      title,
      content,
      tags,
      status,
      tokens,
      authorId,
      authorName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "POST failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = normalize(body.id);
    if (!id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

    const ref = doc(db, "board_posts", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });

    const post = snap.data() as any;
    const slug = normalize(post.slug);
    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });
    if (!perm.edit) return deny("no permission to edit");

    const patch: any = {};
    if (body.title != null) patch.title = normalize(body.title);
    if (body.content != null) patch.content = normalize(body.content);
    if (body.tags != null) patch.tags = Array.isArray(body.tags) ? body.tags.map((t: any) => normalize(t)).filter(Boolean) : [];
    if (body.status != null) patch.status = normalize(body.status);

    // tokens 재계산
    const nextTitle = patch.title ?? post.title ?? "";
    const nextContent = patch.content ?? post.content ?? "";
    const nextTags = patch.tags ?? post.tags ?? [];
    patch.tokens = tokenizeForSearch(nextTitle, nextContent, nextTags);

    patch.updatedAt = serverTimestamp();

    await updateDoc(ref, patch);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "PATCH failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = normalize(url.searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

    const ref = doc(db, "board_posts", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });

    const post = snap.data() as any;
    const slug = normalize(post.slug);
    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });
    if (!perm.edit) return deny("no permission to delete");

    await deleteDoc(ref);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "DELETE failed" }, { status: 500 });
  }
}
