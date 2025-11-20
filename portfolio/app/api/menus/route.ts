// app/api/menus/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMenusByBackend } from "@/lib/services";

export async function GET(req: NextRequest) {
  const backend = (process.env.NEXT_PUBLIC_BACKEND as "postgres" | "firebase" | undefined) ?? "firebase";
  const items = await getMenusByBackend(backend);

  return NextResponse.json({ items });
}
