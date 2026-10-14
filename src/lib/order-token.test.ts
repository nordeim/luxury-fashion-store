// Unit pins for the guest order-view HMAC capability token (ADR-039 pattern).
import { afterEach, describe, expect, it, vi } from "vitest";
import { orderViewToken, verifyOrderViewToken } from "./order-token";

describe("orderViewToken", () => {
  it("is deterministic for a given order number + secret", () => {
    expect(orderViewToken("ORD-2026-001")).toBe(orderViewToken("ORD-2026-001"));
  });

  it("differs across order numbers", () => {
    expect(orderViewToken("ORD-2026-001")).not.toBe(orderViewToken("ORD-2026-002"));
  });

  it("is a 40-char hex capability token (not the raw order number)", () => {
    const token = orderViewToken("ORD-2026-001");
    expect(token).toMatch(/^[0-9a-f]{40}$/);
    expect(token).not.toContain("ORD");
  });
});

describe("verifyOrderViewToken", () => {
  it("accepts the matching token and rejects tampering", () => {
    expect(verifyOrderViewToken("ORD-2026-001", orderViewToken("ORD-2026-001"))).toBe(true);
    expect(verifyOrderViewToken("ORD-2026-001", orderViewToken("ORD-2026-002"))).toBe(false);
    expect(verifyOrderViewToken("ORD-2026-001", `${orderViewToken("ORD-2026-001")}0`)).toBe(false);
    expect(verifyOrderViewToken("ORD-2026-001", "")).toBe(false);
  });
});

// F-1 (session-3): the token secret must be governed like the session secret —
// fail loud in production, dev fallback only outside production.
describe("orderViewToken secret governance", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws in production when AUTH_SECRET is missing/short (no silent public fallback)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => orderViewToken("ORD-2026-001")).toThrow(/AUTH_SECRET/);
  });

  it("works in production with a proper secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    expect(orderViewToken("ORD-2026-001")).toMatch(/^[0-9a-f]{40}$/);
  });

  it("falls back deterministically outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AUTH_SECRET", "");
    expect(orderViewToken("ORD-2026-001")).toBe(orderViewToken("ORD-2026-001"));
  });
});
