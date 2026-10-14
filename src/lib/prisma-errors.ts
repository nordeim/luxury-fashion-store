/**
 * Prisma error classification (G-7, session-4).
 *
 * `P2002` is the concurrent-write signal the action layer relies on for its
 * bounded retry loops (addToCartAction, placeOrderAction). Single source of
 * truth — previously duplicated in cart.ts and checkout.ts.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * `P2025` — "record not found": a row vanished between the action's pre-check
 * and its write (H-23, session-6: a concurrent remove/checkout winning the
 * race). Callers treat it as "the bag has moved on" and re-sync from the
 * fresh DTO instead of throwing a raw 500 across the seam.
 */
export function isRecordNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}
