// backend/src/lib/chat/utils.ts
import 'server-only';

import { google, drive_v3 } from "googleapis";
// import { Prisma as PrismaNS } from "@prisma/client";
// import { prisma } from "@/lib/db";
import OpenAI from "openai";

import type { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { GDriveSearchOpts } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** 텍스트 임베딩 (타이핑 정상화: ts-주석 제거) */
export async function embed(
  text: string,
): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: text,
  });
  // OpenAI 타입이 넓게 잡혀있어서 첫 요소를 고정
  const first = res.data[0] as { embedding: number[] };
  return first.embedding;
}

// 문자열 이스케이프 (Drive 쿼리 안전)
export function escapeDriveQuery(
  input: string
): string {
  if (!input) return "";
  let s = input.replace(/[\u0000-\u001F\u007F]/g, " ");
  s = s.replace(/\\/g, "\\\\");
  s = s.replace(/'/g, "\\'");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// 질문 → 키워드 배열 → fullText AND 쿼리 생성
export function buildFullTextQuery(
  question: string, 
  maxTerms = 5
): string{
  const terms = question
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // 구두점 제거
    .split(/\s+/)
    .filter(t => t.length >= 2)
    .slice(0, maxTerms);

  if (!terms.length) return "trashed = false";

  const clauses = terms.map(t => `fullText contains '${escapeDriveQuery(t)}'`);
  return `trashed = false and (${clauses.join(" and ")})`;
}

/** ────────────────────────────────────────────────────────────────────────────
 * [ADDED] Google Drive 클라이언트 생성
 * - 방법 A: OAuth2 (개인 드라이브 접근)  → GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN 필요
 * - 방법 B: 서비스 계정(공유/워크스페이스) → GOOGLE_SERVICE_ACCOUNT_JSON 필요(파일 공유 필수)
 * ────────────────────────────────────────────────────────────────────────────*/
export async function getDriveClient(): Promise<drive_v3.Drive> {
  // 방법 A: OAuth2 (개인 계정)
  const flag = (process.env.IS_OAUTH2_AVILABLE ?? "").toLowerCase();
  const isOAuth2Available = flag === "1" || flag === "true" || flag === "yes";

  if (isOAuth2Available && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
      // redirectUri는 서버사이드 토큰 리프레시만 쓴다면 생략 가능
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: "v3", auth: oauth2 });
  }

  // 방법 B: 서비스 계정 (파일 공유 필요)
  /* Example GOOGLE_SERVICE_ACCOUNT_JSON: IAM 및 관리자 > 서비스 계정 에서 키 생성 후 JSON 전체 복사 */
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  if (raw) {
    // 방법 B: 서비스 계정 (조직/팀 드라이브용)
    const creds = parseServiceAccountCreds();
    if (typeof creds.private_key === "string") {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    // GoogleAuth 자체를 넘기는 게 타입도 안정적
    return google.drive({ version: "v3", auth });
  }
  throw new Error("Google Drive 자격증명이 없습니다. (OAuth2 또는 서비스계정 설정 필요)");
}

/** ────────────────────────────────────────────────────────────────────────────
 * [ADDED] Drive에서 질문과 관련된 문서 검색 후 텍스트 추출
 * - Google Docs: export(text/plain)
 * - text/* 파일: media 다운로드
 * - 기타(PDF 등)는 여기선 스킵(원하면 추후 OCR/파서 추가)
 * ────────────────────────────────────────────────────────────────────────────*/
export async function searchDocsFromGoogleDrive(
  question: string,
  opts?: GDriveSearchOpts
): Promise<Array<{ content: string }>> {
  if (!question?.trim()) return [{ content: "" }];
  const drive = await getDriveClient();

  const pageSize = Math.min(Math.max(opts?.pageSize ?? 5, 1), 20);

  // 1) fullText 검색: Docs/Slides/Sheets 등에 대해 본문 검색 가능
  const q1 = buildFullTextQuery(question);
  const list = await drive.files.list({
    q: q1,
    fields: "files(id,name,mimeType,owners(emailAddress))",
    pageSize,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: opts?.driveId ? "drive" : "allDrives",
    driveId: opts?.driveId,
  });
  const files = list.data.files ?? [];
  const out: Array<{ content: string }> = [];
  
  try {
    if (files.length > 0) {
      // 파일별 텍스트 추출
      for (const f of files) {
        if (!f.id) continue;

        // Google Docs
        if (f.mimeType === "application/vnd.google-apps.document") {
          const resp = await drive.files.export(
            { fileId: f.id, mimeType: "text/plain" },
            { responseType: "arraybuffer" }
          );
          const text = Buffer.from(resp.data as ArrayBuffer).toString("utf-8");
          if (text.trim()) out.push({ content: `# ${f.name}\n${text}` });
          continue;
        }

        // 일반 텍스트 파일
        if (f.mimeType?.startsWith("text/")) {
          const resp = await drive.files.get(
            { fileId: f.id, alt: "media" },
            { responseType: "arraybuffer" }
          );
          const text = Buffer.from(resp.data as ArrayBuffer).toString("utf-8");
          if (text.trim()) out.push({ content: `# ${f.name}\n${text}` });
          continue;
        }

        // 그 외(MD는 text/markdown으로 잡히므로 위에서 처리됨)
        // PDF/Docs 외 포맷은 여기서 스킵 (필요 시 파서 추가)
      }

      return out;
    }

    // 2) 폴백: 최근 수정 상위 N개 목록 → 본문 추출 → 임베딩 유사도 랭킹
    const q2Parts = ["trashed = false"];
    if (opts?.sharedOnly) q2Parts.push("sharedWithMe = true");
    const q2 = q2Parts.join(" and ");

    const list2 = await drive.files.list({
      q: q2,
      orderBy: "modifiedTime desc",
      fields: "files(id,name,mimeType,modifiedTime)",
      pageSize: opts?.candidateLimit,   // 후보 많이
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: opts?.driveId ? "drive" : "allDrives",
      driveId: opts?.driveId,
    });

    const candidates = list2.data.files ?? [];
    if (candidates.length === 0) return [{ content: "" }];

    // 후보들의 텍스트 추출
    const texts: Array<{ file: drive_v3.Schema$File; content: string }> = [];
    for (const f of candidates) {
      const text = await fetchTextFromDriveFile(drive, f);
      if (text) texts.push({ file: f, content: text });
    }
    if (texts.length === 0) return [{ content: "" }];

    // 질문/문서 임베딩 후 코사인 유사도로 정렬
    const qVec = await embed(trimForEmbedding(question));
    const scored = await Promise.all(
      texts.map(async (t) => {
        const cVec = await embed(trimForEmbedding(t.content));
        return { score: cosineSim(qVec, cVec), content: t.content };
      })
    );

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, pageSize).map(({ content }) => ({ content }));
  } catch (e) {
    console.warn("[searchDocsFromGoogleDrive fetch error]", e);
    return [];
  }
}

/** ────────────────────────────────────────────────────────────────────────────
 * [ADDED] DB chunks에서 유사도 검색 (pgvector)
 * - 질문을 임베딩 후 embedding <-> query 임베딩 유사도 순 정렬
 * - 실패 시(확장 미설치 등) 간단한 ILIKE로 폴백
 * ────────────────────────────────────────────────────────────────────────────*/
export async function searchDocsFromChunks(
  question: string,
  opts?: { topK?: number }
): Promise<Array<{ content: string }>> {
  if (!question?.trim()) return [];

  const topK = Math.min(Math.max(opts?.topK ?? 5, 1), 50);

  try {
    const qVec = await embed(question);
    const vecLiteral = toSqlVector(qVec);

    // Prisma에서 pgvector 리터럴은 문자열로 주입 후 ::vector 캐스팅
    // const rows = await prisma.$queryRaw<{ content: string }[]>`
    //   SELECT content
    //   FROM chunks
    //   ORDER BY embedding <-> ${PrismaNS.raw(`'${vecLiteral}'::vector`)}
    //   LIMIT ${topK}
    // `;
    const rows: any[] = [];
    return rows;
  } catch (e) {
    console.warn("[chunks] vector search 실패, ILIKE 폴백 사용", e);
    // const rows = await prisma.$queryRaw<{ content: string }[]>`
    //   SELECT content
    //   FROM chunks
    //   WHERE content ILIKE ${"%" + question + "%"}
    //   ORDER BY id DESC
    //   LIMIT ${topK}
    // `;
    const rows: any[] = [];
    return rows;
  }
}

/** 다양한 도큐먼트 타입에서 content만 뽑아 텍스트로 */
type dataObj = { content?: string; text?: string; } | string | null | undefined; // 빌드 오류로 인한 분리
export function pickContent(d: dataObj): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  if ("content" in d && typeof d.content === "string") return d.content;
  if (typeof d === "object") return String(d.content ?? d.text ?? "");
  return String(d);
}

/** ────────────────────────────────────────────────────────────────────────────
 * [CHANGED] RAG: 질문으로 유사 문서를 찾아온 뒤 content 문자열 배열을 돌려준다.
 *  - Google Drive + chunks를 병렬로 조회해 합쳐 반환
 *  - 필요 시 길이 컷/중복제거
 * ────────────────────────────────────────────────────────────────────────────*/
type opts = GDriveSearchOpts & { topK?: number; /* 청크 테이블 상위 몇 개에서 embed 데이터에서 찾을 건지 */ };
export async function searchSimilarDocs(
  question: string,
  opts?: opts
): Promise<Array<{ content: string }>> {
  const [fromDrive, fromChunks] = await Promise.all([
    searchDocsFromGoogleDrive(question, opts).catch(() => []),
    searchDocsFromChunks(question, opts).catch(() => []),
  ]);

  const merged = [...fromDrive, ...fromChunks];
  // 간단한 중복 제거(완전 일치 기준)
  const seen = new Set<string>();
  const deduped = merged.filter((d) => {
    const key = pickContent(d).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 너무 길 경우 앞에서 N개만 (원하면 토큰 길이로 자르도록 개선 가능)
  const MAX_DOCS = 10;
  return deduped.slice(0, MAX_DOCS);
}

/** OpenAI 챗 스트리밍을 Web Streams로 감싸기 (text/plain; utf-8) */
export function streamOpenAIChat(
  messages: ChatCompletionMessageParam[],
  model: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  // ReadableStream: for-await chunk들을 enqueue
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages,
          stream: true,
        });

        for await (const part of completion) {
          const chunk = part as ChatCompletionChunk;
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }

        controller.close();
      } catch (e) {
        // 스트림 안에서 에러가 나도 FastAPI와 같은 규약으로 에러 텍스트 출력
        const msg = "\n\n[stream-error] backend exception occurred. See server logs.";
        controller.enqueue(encoder.encode(msg));
        controller.close();
        console.error("[STREAM ERROR]", e);
      }
    },
  });

  return stream;
}


// Google Drive 파일 → 텍스트 추출 (지원 포맷만)
export async function fetchTextFromDriveFile(
  drive: drive_v3.Drive,
  f: drive_v3.Schema$File
): Promise<string | null>  {
  if (!f?.id) return null;
  // Google Docs 문서
  if (f.mimeType === "application/vnd.google-apps.document") {
    const resp = await drive.files.export(
      { fileId: f.id, mimeType: "text/plain" },
      { responseType: "arraybuffer" }
    );
    const text = Buffer.from(resp.data as ArrayBuffer).toString("utf-8");
    return text?.trim() ? `# ${f.name}\n${text}` : null;
  }
  
  // 일반 텍스트 파일
  if (f.mimeType?.startsWith("text/")) {
    const resp = await drive.files.get(
      { fileId: f.id, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const text = Buffer.from(resp.data as ArrayBuffer).toString("utf-8");
    return text?.trim() ? `# ${f.name}\n${text}` : null;
  }

  // (옵션) 구글 스프레드시트 → CSV로 내보내기
  // if (f.mimeType === "application/vnd.google-apps.spreadsheet") {
  //   const resp = await drive.files.export(
  //     { fileId: f.id, mimeType: "text/csv" },
  //     { responseType: "arraybuffer" }
  //   );
  //   const text = Buffer.from(resp.data as ArrayBuffer).toString("utf-8");
  //   return text?.trim() ? `# ${f.name}\n${text}` : null;
  // }

  // 그 외 포맷은 스킵
  return null;
}



// lib/utils.ts
// 코사인 유사도
export function cosineSim(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// 긴 텍스트를 임베딩 전에 잘라내기(토큰/비용 보호)
export function trimForEmbedding(s: string, maxChars = 4000) {
  if (!s) return s;
  return s.length > maxChars ? s.slice(0, maxChars) : s;
}

// pgvector 리터럴 생성 (예: [0.1,0.2,...])
export function toSqlVector(arr: number[]) {
  return `[${arr.join(",")}]`;
}

export function parseServiceAccountCreds() {
  // 둘 중 하나만 쓰면 됨
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  if (raw) return JSON.parse(raw);
  throw new Error("서비스계정 크리덴셜이 없습니다.");
}