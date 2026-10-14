// Unit pins for the in-memory fixed-window rate limiter + client IP seam.
import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIpFrom, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to max requests then blocks within the window", () => {
    const key = `test:block:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const fourth = rateLimit(key, 3, 60_000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("reports remaining budget", () => {
    const key = `test:remaining:${Math.random()}`;
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });

  it("keys are independent (per-IP isolation)", () => {
    const a = `test:iso:a:${Math.random()}`;
    const b = `test:iso:b:${Math.random()}`;
    expect(rateLimit(a, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    const key = `test:window:${Math.random()}`;
    expect(rateLimit(key, 1, 20).allowed).toBe(true);
    expect(rateLimit(key, 1, 20).allowed).toBe(false);
    // Fixed-window semantics: a fresh window grants a fresh budget.
    return new Promise<void>((done) => {
      setTimeout(() => {
        expect(rateLimit(key, 1, 20).allowed).toBe(true);
        done();
      }, 30);
    });
  });
});

describe("clientIpFrom (TRUST_PROXY=1: behind a known proxy)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the first x-forwarded-for hop", () => {
    vi.stubEnv("TRUST_PROXY", "1");
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });
    expect(clientIpFrom(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then the local sentinel", () => {
    vi.stubEnv("TRUST_PROXY", "1");
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIpFrom(new Headers())).toBe("local");
  });
});

// F-6 (session-3): XFF is only trusted when the deployment opts in via
// TRUST_PROXY — otherwise a client can rotate the header to reset buckets.
describe("clientIpFrom", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores x-forwarded-for unless TRUST_PROXY is set", () => {
    vi.stubEnv("TRUST_PROXY", "");
    const ip = clientIpFrom(new Headers({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" }));
    expect(ip).toBe("5.6.7.8");
  });

  it("honors the first XFF hop when TRUST_PROXY=1", () => {
    vi.stubEnv("TRUST_PROXY", "1");
    const ip = clientIpFrom(new Headers({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" }));
    expect(ip).toBe("1.2.3.4");
  });

  it("falls back to local when no address signals exist", () => {
    vi.stubEnv("TRUST_PROXY", "");
    expect(clientIpFrom(new Headers())).toBe("local");
  });
});
