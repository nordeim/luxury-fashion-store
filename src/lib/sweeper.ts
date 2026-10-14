// Transient-state sweeper (K-1, session-6 — carried since session 3).
//
// Sessions outlive their holders (logout-elsewhere rows, expired-never-revisited)
// and guest carts/wishlists accumulate forever — the DB grew monotonically.
// `buildSweepPlan` is the pure decision seam (unit-pinned); `runSweep` is the
// thin Prisma executor wired into `src/instrumentation.ts` (one sweep at boot
// + hourly). Multi-instance deployments would run duplicate sweeps — harmless,
// the deletes are idempotent.

export const GUEST_CART_IDLE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SweepPlan {
  sessionWhere: { expiresAt: { lt: Date } };
  guestCartWhere: { userId: null; updatedAt: { lt: Date } };
  guestWishlistWhere: { userId: null; updatedAt: { lt: Date } };
}

export function buildSweepPlan(now: Date): SweepPlan {
  const cartCutoff = new Date(now.getTime() - GUEST_CART_IDLE_MS);
  return {
    // Session rows past their stored expiry (the auth layer also deletes
    // lazily on presentation — this catches rows never presented again).
    sessionWhere: { expiresAt: { lt: now } },
    // Guest (cookie-token) carts/wishlists idle beyond the window. User-owned
    // rows are server truth for a signed-in customer — never garbage.
    guestCartWhere: { userId: null, updatedAt: { lt: cartCutoff } },
    guestWishlistWhere: { userId: null, updatedAt: { lt: cartCutoff } },
  };
}

export interface SweepResult {
  sessions: number;
  carts: number;
  wishlists: number;
}

export async function runSweep(now: Date = new Date()): Promise<SweepResult> {
  const { db } = await import("@/lib/db");
  const plan = buildSweepPlan(now);
  const [sessions, carts, wishlists] = await Promise.all([
    db.session.deleteMany({ where: plan.sessionWhere }),
    db.cart.deleteMany({ where: plan.guestCartWhere }),
    db.wishlist.deleteMany({ where: plan.guestWishlistWhere }),
  ]);
  return { sessions: sessions.count, carts: carts.count, wishlists: wishlists.count };
}
