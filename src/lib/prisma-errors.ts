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
