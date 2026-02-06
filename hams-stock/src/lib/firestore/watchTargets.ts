// src/lib/firestore/watchTargets.ts
import { db } from "$lib/firebase/client";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// URL을 안전한 문서ID로 변환 (base64url 느낌으로)
function toDocId(uid: string, channelUrl: string) {
  // btoa는 유니코드에 약해서 encodeURIComponent 한번 감쌈
  const safe = btoa(unescape(encodeURIComponent(channelUrl)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `wt_${uid}_${safe}`;
}


async function resolveChannelId(channelUrl: string): Promise<string | null> {
  try {
    // same-origin 서버 API 호출(SvelteKit)
    const u = `/api/youtube/resolve-channel?url=${encodeURIComponent(channelUrl)}`;
    const res = await fetch(u);
    if (!res.ok) return null;
    const data = (await res.json()) as { channelId?: string | null };
    return data.channelId ?? null;
  } catch {
    return null;
  }
}

export async function upsertWatchTarget(uid: string, channelUrl: string) {
  const id = toDocId(uid, channelUrl);
  const ref = doc(db, "watch_targets", id);
  
  // channelId 추출
  const channelId = await resolveChannelId(channelUrl);

  await setDoc(
    ref,
    {
      uid,
      channelUrl,
      channelId: channelId ?? undefined,
      enabled: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // setDoc merge라서 최초만 의미 있음
    },
    { merge: true }
  );

  return id;
}

export async function setWatchTargetEnabled(uid: string, channelUrl: string, enabled: boolean) {
  const id = toDocId(uid, channelUrl);
  await updateDoc(doc(db, "watch_targets", id), {
    enabled,
    updatedAt: serverTimestamp(),
  });
}

export async function removeWatchTarget(uid: string, channelUrl: string) {
  const id = toDocId(uid, channelUrl);
  await deleteDoc(doc(db, "watch_targets", id));
}
