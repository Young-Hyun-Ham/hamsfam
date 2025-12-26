import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, message: "Postgres backend not implemented" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ ok: false, message: "Postgres backend not implemented" }, { status: 501 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, message: "Postgres backend not implemented" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, message: "Postgres backend not implemented" }, { status: 501 });
}
