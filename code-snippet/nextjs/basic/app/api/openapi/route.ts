export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildAutoOpenApiSpec } from "@/lib/openapi-autogen";
import { buildJsdocSpec, deepMerge } from "@/lib/openapi-jsdoc";

const ALLOW_ORIGIN = process.env.FRONT_ORIGIN ?? "http://localhost:3001";

/**
 * @summary openApi spec create
 * @description api 스펙 생성
 * @tag openApi
 */
export async function GET() {
  const autoSpec = buildAutoOpenApiSpec();
  const jsdocSpec = buildJsdocSpec(); // JSDoc가 있으면 세부 스키마/설명이 추가됨
  const merged = deepMerge(autoSpec, jsdocSpec);
  return NextResponse.json(merged, {
    headers: {
      "Cache-Control": "no-store",
      // (프론트가 다른 포트에서 Swagger UI를 띄울 경우)
      "Access-Control-Allow-Origin": process.env.FRONT_ORIGIN ?? "*",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
