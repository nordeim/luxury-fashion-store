// Guest order-confirmation view tokens — HMAC capability tokens.
// Sequential order numbers are NOT capability tokens (ADR-039 pattern):
// an unauthenticated visitor must present `?order=N&t=<hmac>` to view a
// guest order; signed-in owners see their orders via userId.
//
// F-1/F-2 (session-3): the secret is the GOVERNED capability secret (strict
// in production — no silent public fallback), and verification is
// timing-safe. Previously this module kept its own lenient fallback, so a
// production deploy that forgot AUTH_SECRET silently HMAC'd guest-order
// capability tokens with a public constant.

import { createHmac, timingSafeEqual } from "node:crypto";
import { capabilitySecret } from "./auth";

function secret(): string {
  return capabilitySecret();
}

export function orderViewToken(orderNumber: string): string {
  return createHmac("sha256", secret()).update(`order-view:${orderNumber}`).digest("hex").slice(0, 40);
}

export function verifyOrderViewToken(orderNumber: string, token: string): boolean {
  const expected = Buffer.from(orderViewToken(orderNumber));
  const presented = Buffer.from(token);
  if (presented.length !== expected.length) return false;
  return timingSafeEqual(presented, expected);
}
