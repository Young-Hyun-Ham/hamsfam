// src/app/api/ollama/[...path]/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// export const maxDuration = 300; // (필요시 스트리밍 여유)

const BASE = process.env.OLLAMA_URL || "http://localhost:11434";

// 'any' 타입을 사용하여 Next.js의 잘못된 타입 추론을 우회합니다.
async function proxy(req: NextRequest, params: any) {
  const path = params.path as string[]; // params 객체에서 path 배열을 추출합니다.
  const { search } = req.nextUrl;
  const targetUrl = `${BASE}/api/${path.join("/")}${search || ""}`;

  // GET/HEAD 요청이 아닐 경우에만 body를 읽습니다.
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // 필요한 헤더만 선택적으로 전달합니다.
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        Accept: req.headers.get("Accept") || "*/*",
        Authorization: req.headers.get("Authorization") || "",
      },
      body: body,
    });

    // Ollama API의 응답을 그대로 스트리밍하여 반환합니다.
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Proxy request failed:", error);
    return NextResponse.json(
      { error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: any } // context 객체의 타입을 any로 지정
) {
  return proxy(req, params);
}

/**
 * @summary ollama
 * @description 올라마 GET
 * @tag ollama
 */
export async function GET(
  req: NextRequest,
  { params }: { params: any } // context 객체의 타입을 any로 지정
) {
  return proxy(req, params);
}

/**
 * @summary ollama
 * @description 올라마 POST
 * @tag ollama
 */
export async function POST(
  req: NextRequest,
  { params }: { params: any } // context 객체의 타입을 any로 지정
) {
  return proxy(req, params);
}