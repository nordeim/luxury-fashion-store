import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";

// Newsletter subscribe — one of the whitelisted route handlers.
// Zod-validated, rate-limited 10/10min/IP, idempotent upsert.

export async function POST(request: Request) {
  const limiter = rateLimit(`newsletter:${clientIpFrom(request.headers)}`, 10, 10 * 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = emailSchema.safeParse((body as { email?: unknown })?.email);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.toLowerCase();
  await db.newsletterSubscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return NextResponse.json({ ok: true });
}
