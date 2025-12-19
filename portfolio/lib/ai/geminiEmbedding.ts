// lib/ai/geminiEmbedding.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "";
const EMBED_MODEL = process.env.GOOGLE_GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const EMBED_DIM = Number(process.env.GOOGLE_GEMINI_EMBEDDING_DIM || 768);

if (!API_KEY) {
  // 서버 실행 시점에 키가 없으면 바로 알 수 있게
  console.warn("[geminiEmbedding] GOOGLE_GEMINI_API_KEY is empty");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: EMBED_MODEL });

export type EmbedResult = {
  values: number[];
  model: string;
  dim: number;
};

export async function embedText(text: string): Promise<EmbedResult> {
  const input = (text ?? "").toString().trim();
  if (!input) return { values: [], model: EMBED_MODEL, dim: EMBED_DIM };

  // SDK 버전/형태 차이를 안전하게 처리(타입은 any)
  // - 어떤 예시는 embedContent("text") 형태를 사용
  // - 문서/엔드포인트는 output_dimensionality 지원
  //   (SDK에서 옵션이 다를 수 있어 any로 처리)
  const anyModel: any = model;

  let res: any;
  try {
    // 가장 단순 호출(일부 SDK에서 지원)
    res = await anyModel.embedContent(input);
  } catch {
    // 옵션/구조형 호출(지원 시 output_dimensionality 적용)
    res = await anyModel.embedContent({
      content: { parts: [{ text: input }] },
      output_dimensionality: EMBED_DIM,
    });
  }

  const values: number[] = res?.embedding?.values ?? res?.embedding?.value ?? [];
  return { values, model: EMBED_MODEL, dim: values.length || EMBED_DIM };
}
