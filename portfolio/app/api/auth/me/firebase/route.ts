// app/api/auth/me/firebase/route.ts
import { NextResponse } from "next/server";
import { getUserServer } from "@/lib/session";

export async function GET() {
  const user = await getUserServer();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(user);
}
