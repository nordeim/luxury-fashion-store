import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Liveness probe: { ok, db } — first stop when the server misbehaves.

export async function GET() {
  try {
    await db.product.count();
    return NextResponse.json({ ok: true, db: true });
  } catch {
    return NextResponse.json({ ok: true, db: false });
  }
}
