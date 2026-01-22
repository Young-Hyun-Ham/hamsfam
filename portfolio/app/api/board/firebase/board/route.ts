// app/api/board/firebase/board/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getCategoryPerm } from "./_utils";
import { normalize, tokenizeForSearch } from "@/lib/utils/utils";
import { hashPassword } from "@/lib/utils/password";
import { randomUUID } from "crypto";

const COL = "board_posts";
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

    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? 20), MAX_LIMIT);
    const cursorId = normalize(url.searchParams.get("cursorId"));
    const keyword = normalize(url.searchParams.get("keyword")).toLowerCase();

    const colRef = adminDb.collection(COL);

    // ✅ base query (slug + createdAt desc)
    let q: FirebaseFirestore.Query = colRef
      .where("slug", "==", slug)
      .orderBy("createdAt", "desc");

    // ✅ cursor 적용 (startAfter는 DocumentSnapshot 필요)
    if (cursorId) {
      const lastSnap = await colRef.doc(cursorId).get();
      if (lastSnap.exists) {
        q = q.startAfter(lastSnap);
      }
    }

    q = q.limit(pageSize + 1);

    const snap = await q.get();

    let rows = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id, // ✅ 문서ID
        ...data,
        passwordHash: undefined, // 응답에서 제거
      };
    });

    // keyword 필터 (현재 MVP 방식 유지)
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

    const id = randomUUID();

    const title = normalize(body.title);
    const content = normalize(body.content);
    const tags = Array.isArray(body.tags) ? body.tags.map((t: any) => normalize(t)).filter(Boolean) : [];
    const status = normalize(body.status) || "published";
    const authorId = normalize(body.authorId) || null;
    const authorName = normalize(body.authorName) || "익명";

    const pw = normalize(body.password);
    const passwordHash = pw ? await hashPassword(pw) : "";
    const hasPassword = Boolean(pw);

    if (!title) return NextResponse.json({ ok: false, message: "title is required" }, { status: 400 });

    const tokens = tokenizeForSearch(title, content, tags);

    // ✅ adminDb: 문서ID를 id로 고정 (cursorId 안정화)
    await adminDb.collection(COL).doc(id).set({
      id, // 필드에도 유지(기존 호환)
      slug,
      title,
      content,
      tags,
      status,
      tokens,
      authorId,
      authorName,
      hasPassword,
      passwordHash: passwordHash || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "POST failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = normalize(body.id);
    if (!id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

    const ref = adminDb.collection(COL).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });

    const post = snap.data() as any;
    const slug = normalize(post.slug);

    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });
    if (!perm.edit) return deny("no permission to edit");

    const patch: any = {};

    if (body.title != null) patch.title = normalize(body.title);
    if (body.content != null) patch.content = normalize(body.content);
    if (body.tags != null)
      patch.tags = Array.isArray(body.tags) ? body.tags.map((t: any) => normalize(t)).filter(Boolean) : [];
    if (body.status != null) patch.status = normalize(body.status);

    // ✅ password 변경
    if (body.password != null) {
      const pw = normalize(body.password);
      if (pw) {
        patch.hasPassword = true;
        patch.passwordHash = await hashPassword(pw);
      } else {
        // 빈 문자열이면 비번 해제
        patch.hasPassword = false;
        patch.passwordHash = null;
      }
    }

    // ✅ tokens 재계산
    const nextTitle = patch.title ?? post.title ?? "";
    const nextContent = patch.content ?? post.content ?? "";
    const nextTags = patch.tags ?? post.tags ?? [];
    patch.tokens = tokenizeForSearch(nextTitle, nextContent, nextTags);

    patch.updatedAt = new Date().toISOString();

    // ✅ adminDb update
    await ref.update(patch);

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

    const ref = adminDb.collection(COL).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: false, message: "post not found" }, { status: 404 });

    const post = snap.data() as any;
    const slug = normalize(post.slug);

    const perm = await getCategoryPerm(slug);
    if (!perm) return NextResponse.json({ ok: false, message: "category not found" }, { status: 404 });
    if (!perm.edit) return deny("no permission to delete");

    await ref.delete();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "DELETE failed" }, { status: 500 });
  }
}
