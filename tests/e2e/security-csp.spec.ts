/**
 * N-1 + F-B (session-19): the CSP / structured-data gate.
 *
 * N-1: production retires `script-src 'unsafe-inline'` — the CSP is minted
 * per-request by src/proxy.ts with a fresh 128-bit nonce. Next reads the
 * nonce from the REQUEST header (parse-request-headers.js) and stamps it on
 * every script it controls, so the assertions here are: the header shape
 * (nonce present, unsafe-inline gone), the nonce actually reaching EVERY
 * inline script, and the page still hydrating (a blocked bootstrap script
 * kills hydration — the click + console checks make that loud).
 *
 * F-B: the PDP embeds a schema.org Product graph as a non-executing
 * JSON-LD data block (exempt from script-src by the HTML spec) — asserted
 * present, parseable, and carrying the seeded price.
 *
 * Session-30 extension (F-AA — the static transport headers):
 *
 * F-AA: next.config.ts `async headers()` ships SIX security headers on
 * `/:path*` (Referrer-Policy, X-Content-Type-Options, Strict-Transport-
 * Security, X-Frame-Options, Permissions-Policy, Cross-Origin-Opener-Policy)
 * and both AGENTS.md and README declare them in prose — yet no gate ever
 * asserted them over the wire (the F-Y family: a declared contract the
 * gates never exercise; a typo'd key would silently strip e.g.
 * X-Frame-Options: DENY from every response with every gate green). The
 * new describe pins all six EXACT values on three route classes (document
 * root, deep PDP route, API route) — assumptions wire-verified first-hand
 * by scripts/plan-probe-session30.cjs (21/21) BEFORE the spec was written.
 * The CSP is deliberately NOT pinned here as a static header — it is minted
 * per-request by src/proxy.ts (the cases above) and a static one would
 * defeat the nonce.
 *
 * These tests run against the production standalone (NODE_ENV=production —
 * the webServer env), so the dev escape hatch (unsafe-inline + unsafe-eval)
 * must NOT appear.
 */
import { expect, test } from "@playwright/test";

const SEEDED_GOWN = "/product/silk-draped-evening-gown";
const SEEDED_GOWN_PRICE = "2850.00"; // 285000 cents — catalog pin (src/lib/data/catalog.ts)

function scriptSrcOf(csp: string): string {
  const directive = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src"));
  expect(directive, "CSP carries a script-src directive").toBeTruthy();
  return directive as string;
}

test.describe("security CSP + structured data (N-1/F-B)", () => {
  test("production CSP on / is nonce-only (no unsafe-inline, no unsafe-eval)", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "load" });
    const csp = response?.headers()["content-security-policy"];
    expect(csp, "CSP header present").toBeTruthy();
    const scriptSrc = scriptSrcOf(csp as string);
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/_-]+={0,2}'/);
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    // The one deliberate style exception stays documented:
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  test("every inline script carries the exact request nonce (in the served bytes)", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "load" });
    const nonce = scriptSrcOf(response?.headers()["content-security-policy"] as string)
      .split(" ")
      .find((s) => s.startsWith("'nonce-"))
      ?.slice(7, -1);
    expect(nonce, "header nonce extracted").toBeTruthy();

    // NOTE: read the SERVED HTML, not the DOM — browsers HIDE the nonce
    // content attribute after parsing (CSP nonce-hiding: the value moves to
    // an internal slot, getAttribute("nonce") returns ""). The bytes the
    // browser parses are the CSP ground truth.
    const html = (await response?.text()) ?? "";
    const inlineTags = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)).map(
      (m) => m[0]
    );
    expect(inlineTags.length, "Next ships inline bootstrap scripts").toBeGreaterThan(0);
    for (const tag of inlineTags) {
      expect(
        tag,
        `inline script tag lacks the exact header nonce: ${tag.slice(0, 120)}`
      ).toContain(`nonce="${nonce}"`);
    }
  });

  test("the page hydrates under the nonce CSP (interaction + clean console)", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await page.goto("/", { waitUntil: "load" });

    // Parity-safe interaction: open the search overlay (a client island).
    await page.getByRole("button", { name: /search/i }).first().click();
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    expect(
      consoleErrors.filter((e) => /content security policy|refused to (execute|apply)/i.test(e)),
      "no CSP violations on the console"
    ).toEqual([]);
  });

  test("the nonce CSP ships on every document route", async ({ page }) => {
    for (const route of ["/", "/shop", "/cart", "/login", "/register", SEEDED_GOWN]) {
      const response = await page.goto(route, { waitUntil: "load" });
      const csp = response?.headers()["content-security-policy"];
      expect(csp, `CSP present on ${route}`).toBeTruthy();
      const scriptSrc = scriptSrcOf(csp as string);
      expect(scriptSrc, `nonce on ${route}`).toMatch(/'nonce-/);
      expect(scriptSrc, `no unsafe-inline on ${route}`).not.toContain("unsafe-inline");
    }
  });

  test("PDP embeds parseable Product JSON-LD with the seeded price", async ({ page }) => {
    await page.goto(SEEDED_GOWN, { waitUntil: "load" });
    // Session-25: the storefront layout renders the site-level WebSite +
    // Organization identity blocks on EVERY storefront page (outside <main>),
    // so the PDP now serves THREE data blocks — select the Product graph by
    // its @type, never by document position.
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) =>
        els
          .map((el) => el.textContent ?? "")
          .find((t) => t.includes('"@type":"Product"'))
      );
    expect(raw, "Product JSON-LD data block present").toBeTruthy();
    const ld = JSON.parse(raw as string) as {
      "@type": string;
      name: string;
      offers: { price: string; priceCurrency: string; availability: string };
    };
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Silk Draped Evening Gown");
    expect(ld.offers.price).toBe(SEEDED_GOWN_PRICE);
    expect(ld.offers.priceCurrency).toBe("USD");
    expect(ld.offers.availability).toBe("https://schema.org/InStock");
  });
});

// F-AA (session-30): the static transport-header contract — next.config.ts
// `async headers()` on `/:path*`, declared in AGENTS.md/README, now pinned
// over the wire. EXACT-value assertions (=== the declaration, not
// substring): a value drift fails the gate, not just a dropped key. One
// case per route class keeps failures surgical (a dropped header fails all
// three; a route-scoped regression fails exactly one). All values
// wire-verified by scripts/plan-probe-session30.cjs before pinning.
const TRANSPORT_HEADERS: Record<string, string> = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "strict-transport-security": "max-age=31536000",
  "x-frame-options": "DENY",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "cross-origin-opener-policy": "same-origin",
};

test.describe("static transport headers (F-AA, session-30)", () => {
  for (const [route, label] of [
    ["/", "the document root"],
    [SEEDED_GOWN, "the deep PDP route"],
    ["/api/health", "the API route class"],
  ] as const) {
    test(`the six declared transport headers serve exact values on ${label}`, async ({
      request,
    }) => {
      const res = await request.get(route);
      expect(res.status(), `GET ${route}`).toBe(200);
      const headers = res.headers();
      for (const [name, want] of Object.entries(TRANSPORT_HEADERS)) {
        expect(headers[name], `${route} :: ${name}`).toBe(want);
      }
    });
  }
});
