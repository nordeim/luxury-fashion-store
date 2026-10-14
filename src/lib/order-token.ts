// Guest order-confirmation view tokens — HMAC capability tokens.
// Sequential order numbers are NOT capability tokens (ADR-039 pattern):
// an unauthenticated visitor must present `?order=N&t=<hmac>` to view a
// guest order; signed-in owners see their orders via userId.

import { createHmac } from "node:crypto";

function secret(): string {
  return process.env.AUTH_SECRET ?? "aurelia-dev-secret-rotate-in-production-4f8b2c";
}

export function orderViewToken(orderNumber: string): string {
  return createHmac("sha256", secret()).update(`order-view:${orderNumber}`).digest("hex").slice(0, 40);
}

export function verifyOrderViewToken(orderNumber: string, token: string): boolean {
  const expected = orderViewToken(orderNumber);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && a.toString("utf8") === b.toString("utf8");
}
