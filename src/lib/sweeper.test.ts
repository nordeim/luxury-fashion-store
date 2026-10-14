import { describe, expect, it } from "vitest";
import { GUEST_CART_IDLE_MS, buildSweepPlan } from "./sweeper";

describe("buildSweepPlan (K-1 transient sweeper)", () => {
  it("sweeps sessions already past their stored expiry", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const plan = buildSweepPlan(now);
    expect(plan.sessionWhere).toEqual({ expiresAt: { lt: now } });
  });

  it("sweeps guest carts idle strictly beyond the 30-day window", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const plan = buildSweepPlan(now);
    expect(plan.guestCartWhere).toEqual({
      userId: null,
      updatedAt: { lt: new Date(now.getTime() - GUEST_CART_IDLE_MS) },
    });
    expect(GUEST_CART_IDLE_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("sweeps guest wishlists under the same idle window", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const plan = buildSweepPlan(now);
    expect(plan.guestWishlistWhere).toEqual(plan.guestCartWhere);
  });

  it("never sweeps user-owned carts or wishlists regardless of idle time", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const plan = buildSweepPlan(now);
    // The userId: null discriminator is the ownership guard — a member cart is
    // server truth for a signed-in customer and must never be garbage.
    expect((plan.guestCartWhere as { userId: unknown }).userId).toBeNull();
    expect((plan.guestWishlistWhere as { userId: unknown }).userId).toBeNull();
  });

  it("is deterministic for a given clock reading", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    expect(buildSweepPlan(now)).toEqual(buildSweepPlan(new Date("2026-10-14T12:00:00Z")));
  });
});
