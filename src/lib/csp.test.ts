import { describe, expect, it } from "vitest";
import { buildCspHeader, mintNonce } from "./csp";

// N-1 (session-19): the CSP seam. Production script-src must be nonce-only —
// 'unsafe-inline' is retired. Dev keeps the F-7 escape hatch (React's dev
// runtime needs eval). The nonce format must satisfy the regex Next's
// getScriptNonceFromHeader applies to the request CSP header, or the nonce
// never reaches Next's bootstrap scripts.

/** Mirror of next/dist/server/app-render/get-script-nonce-from-header.js. */
const NEXT_NONCE_REGEX = /^[A-Za-z0-9+/_-]+={0,2}$/;

function scriptSrcOf(header: string): string {
  const directive = header
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src"));
  expect(directive, "header carries a script-src directive").toBeTruthy();
  return directive as string;
}

describe("buildCspHeader (production)", () => {
  const header = buildCspHeader({ nonce: "abc123_-XYZ==", isDev: false });

  it("carries the nonce on script-src next to 'self'", () => {
    expect(scriptSrcOf(header)).toBe("script-src 'self' 'nonce-abc123_-XYZ=='");
  });

  it("never ships unsafe-inline or unsafe-eval in production", () => {
    expect(scriptSrcOf(header)).not.toContain("unsafe-inline");
    expect(header).not.toContain("unsafe-eval");
  });

  it("keeps style-src 'unsafe-inline' (React inline styles + Tailwind — documented)", () => {
    expect(header).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("keeps every non-script directive byte-stable with the session-3 policy", () => {
    const nonScript = header
      .split("; ")
      .filter((d) => !d.startsWith("script-src"))
      .join("; ");
    expect(nonScript).toBe(
      [
        "default-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://images.unsplash.com",
        "font-src 'self'",
        "connect-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'",
      ].join("; ")
    );
  });

  it("emits each directive exactly once (duplicate CSP directives intersect)", () => {
    const names = header.split("; ").map((d) => d.split(" ")[0]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("buildCspHeader (development)", () => {
  it("keeps the F-7 dev escape hatch on script-src", () => {
    const header = buildCspHeader({ isDev: true });
    expect(scriptSrcOf(header)).toBe("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });

  it("falls back to a nonceless script-src 'self' in production (loud, never unsafe)", () => {
    const header = buildCspHeader({ isDev: false });
    expect(scriptSrcOf(header)).toBe("script-src 'self'");
  });
});

describe("mintNonce", () => {
  it("mints base64 nonces Next's own regex accepts", () => {
    const nonce = mintNonce();
    expect(nonce).toMatch(NEXT_NONCE_REGEX);
  });

  it("mints 128-bit entropy (16 bytes → 24 base64 chars incl. padding)", () => {
    expect(mintNonce()).toHaveLength(24);
  });

  it("is random across calls", () => {
    expect(mintNonce()).not.toBe(mintNonce());
  });

  it("survives a round-trip through the header builder", () => {
    const nonce = mintNonce();
    const header = buildCspHeader({ nonce, isDev: false });
    const source = scriptSrcOf(header).split(" ").find((s) => s.startsWith("'nonce-"));
    expect(source).toBe(`'nonce-${nonce}'`);
    expect((source as string).slice(7, -1)).toMatch(NEXT_NONCE_REGEX);
  });
});
