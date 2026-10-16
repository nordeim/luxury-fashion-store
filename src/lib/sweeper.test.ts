import { describe, expect, it } from "vitest";
import { GUEST_CART_IDLE_MS, buildSweepPlan, isSchemaNotReady } from "./sweeper";

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

describe("isSchemaNotReady (F-J: the boot-sweep P2021 classifier)", () => {
  it("recognizes the P2021 shape — the boot race's observed failure (schema-less e2e.db / pre-migration deploy)", () => {
    // The exact shape instrumentation.ts catches: PrismaClientKnownRequestError
    // carries `code` plus a `meta` payload. The classifier reads the code only.
    const p2021 = Object.assign(new Error("Invalid `prisma.session.deleteMany()` invocation:"), {
      code: "P2021",
      meta: { modelName: "Session", table: "main.Session" },
      clientVersion: "6.19.3",
    });
    expect(isSchemaNotReady(p2021)).toBe(true);
    // A bare code-carrier (no Prisma class identity) must classify the same way —
    // the classifier must not couple to the Prisma constructor.
    expect(isSchemaNotReady({ code: "P2021" })).toBe(true);
  });

  it("rejects every other Prisma code — those stay loud", () => {
    expect(isSchemaNotReady(Object.assign(new Error("unique"), { code: "P2002" }))).toBe(false);
    expect(isSchemaNotReady(Object.assign(new Error("missing"), { code: "P2025" }))).toBe(false);
    expect(isSchemaNotReady(Object.assign(new Error("column"), { code: "P2022" }))).toBe(false);
  });

  it("rejects non-object and object-without-code values — never throws on junk", () => {
    expect(isSchemaNotReady(null)).toBe(false);
    expect(isSchemaNotReady(undefined)).toBe(false);
    expect(isSchemaNotReady("P2021")).toBe(false);
    expect(isSchemaNotReady(new Error("plain"))).toBe(false);
    expect(isSchemaNotReady({})).toBe(false);
  });
});
