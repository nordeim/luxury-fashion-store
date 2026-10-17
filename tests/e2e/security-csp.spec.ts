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
 * per-request by src/proxy.ts (the cases below) and a static one would
 * defeat the nonce.
 *
 * Session-31 extension (F-BB — the cookie-security contract):
 *
 * F-BB: THREE cookies ship the same hardened attribute set in source —
 * aurelia_session (src/lib/auth.ts: httpOnly, sameSite "lax", secure in
 * production, path "/", Expires = now + 30d, value = `token.hmac(token)`),
 * aurelia_cart and aurelia_wishlist (src/lib/cart.ts: same flags, maxAge
 * 2592000, value = the declared 192-bit random hex token) — and the docs
 * declare the shape ("HMAC-signed httpOnly cookies"; "192-bit random
 * token"), yet no gate ever asserted a Set-Cookie attribute (every tests/
 * Set-Cookie reference is the action-seam's ABSENCE probes; the storageState
 * fixtures record the flags without asserting them — the F-Y/F-AA family:
 * a declared contract the gates never exercise; a flipped httpOnly would
 * silently expose the session/cart/wishlist tokens to script with every
 * gate green). The new describe drives the three REAL minting flows in
 * fresh logged-out contexts (guest add-to-bag, guest wishlist toggle,
 * demo-customer login — limiter budget: 2 setup + 2 throwaway + 2 here =
 * 6 < 10 per IP+email) and pins the BROWSER-ENFORCED state via
 * context.cookies() — the strongest witness: the flags the browser parsed
 * and will enforce, not Next's header-string serialization. Assumptions
 * wire-verified first-hand by scripts/plan-probe-session31.cjs (21/21,
 * against a throwaway DB copy) BEFORE the spec was written. The minted
 * rows are SQL-cleaned in afterAll keyed by the captured tokens (the raw
 * session token is the cookie value's first dot-segment — the declared
 * `token.hmac(token)` shape), so the canonical per-project sessions and
 * any other shared state stay untouched (H-24).
 *
 * These tests run against the production standalone (NODE_ENV=production —
 * the webServer env), so the dev escape hatch (unsafe-inline + unsafe-eval)
 * must NOT appear, and `secure` cookies are served (and stored — Chrome
 * treats the localhost origin as trustworthy).
 */
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const SEEDED_GOWN = "/product/silk-draped-evening-gown";
const SEEDED_GOWN_PRICE = "2850.00"; // 285000 cents — catalog pin (src/lib/data/catalog.ts)

// F-BB (session-31) — the cleanup toolchain. Trap #13 discipline:
// process.cwd()-based paths (the Playwright loader compiles TS as CJS).
const REPO = process.cwd();
const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;

/** SQL fixture helper — the established `prisma db execute` pattern (H-24). */
function sqlRun(sql: string): void {
  const dir = mkdtempSync(path.join(os.tmpdir(), "fbb-cookie-"));
  const file = path.join(dir, "fixture.sql");
  writeFileSync(file, sql);
  try {
    const res = spawnSync(
      "npx",
      ["prisma", "db", "execute", "--schema", SCHEMA, "--file", file],
      { env: { ...process.env, DATABASE_URL: E2E_DB_URL }, stdio: "pipe", encoding: "utf8" },
    );
    if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  } finally {
    unlinkSync(file);
  }
}

/** The browser-enforced cookie shape (structural — Playwright's Cookie type). */
type JarCookie = {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "Strict" | "Lax" | "None";
  secure: boolean;
  path: string;
  expires: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The declared hardened set: src/lib/auth.ts:88-96 + src/lib/cart.ts:112/140. */
function expectHardened(c: JarCookie, label: string): void {
  expect(c.httpOnly, `${label}: HttpOnly (XSS mitigation)`).toBe(true);
  expect(c.sameSite, `${label}: SameSite=Lax (CSRF mitigation)`).toBe("Lax");
  expect(c.secure, `${label}: Secure (production standalone)`).toBe(true);
  expect(c.path, `${label}: Path=/`).toBe("/");
  const ageDays = (c.expires * 1000 - Date.now()) / DAY_MS;
  expect(
    ageDays,
    `${label}: ~30d persistence (SESSION_TTL_DAYS / maxAge 2592000)`,
  ).toBeGreaterThan(29);
  expect(ageDays, `${label}: ~30d persistence upper bound`).toBeLessThan(31);
}

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

// F-BB (session-31): the three minting flows in fresh logged-out contexts —
// the cookies the browser actually stores, asserted from the browser jar.
// One case per SEAM keeps failures surgical (a flipped flag on one setter
// fails exactly its case — the F-AA route-class precedent, one layer down).
// The minted rows self-clean via afterAll (H-24): the captured tokens key
// the deletes, so the canonical per-project sessions and shared state stay
// untouched.
const capturedTokens: { table: string; token: string }[] = [];

function captureForCleanup(table: string, name: string, value: string): void {
  // The session cookie carries `token.hmac(token)` (the declared shape in
  // src/lib/auth.ts) — the raw DB token is the first dot-segment. The
  // cart/wishlist cookies carry the raw 48-hex token.
  const token =
    name === "aurelia_session" ? value.slice(0, value.lastIndexOf(".")) : value;
  capturedTokens.push({ table, token });
}

test.describe("cookie security attributes (F-BB, session-31)", () => {
  // Fresh logged-out contexts: the flows must mint GUEST identity cookies
  // (and the login case its session) — never ride the per-project sessions.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the guest cart cookie mints with the hardened attribute set on add-to-bag", async ({
    page,
  }) => {
    await page.goto(SEEDED_GOWN, { waitUntil: "domcontentloaded" });
    // The PDP preselects sizes[0] (product-detail.tsx) — the CTA posts directly.
    await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    const c = (await page.context().cookies()).find(
      (k) => k.name === "aurelia_cart",
    );
    expect(c, "aurelia_cart in the browser jar").toBeTruthy();
    expectHardened(c as JarCookie, "aurelia_cart");
    // The declared 192-bit random token (randomBytes(24) → 48 hex chars).
    expect(
      /^[0-9a-f]{48}$/.test((c as JarCookie).value),
      "aurelia_cart value is the declared 192-bit hex token",
    ).toBe(true);
    captureForCleanup("Cart", "aurelia_cart", (c as JarCookie).value);
  });

  test("the guest wishlist cookie mints with the hardened attribute set on the PDP toggle", async ({
    page,
  }) => {
    await page.goto(SEEDED_GOWN, { waitUntil: "domcontentloaded" });
    const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
    await wishBtn.waitFor({ state: "visible" });
    // H-13 lesson: never trust shared-DB resting state — normalize first.
    if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
      await wishBtn.click();
      await page
        .locator("main")
        .getByRole("button", { name: /Add to Wishlist/i })
        .first()
        .waitFor({ timeout: 10_000 });
    }
    await page.locator("main").getByRole("button", { name: /Add to Wishlist/i }).first().click();
    await page
      .locator("main")
      .getByRole("button", { name: /In Wishlist/i })
      .first()
      .waitFor({ timeout: 10_000 });
    const c = (await page.context().cookies()).find(
      (k) => k.name === "aurelia_wishlist",
    );
    expect(c, "aurelia_wishlist in the browser jar").toBeTruthy();
    expectHardened(c as JarCookie, "aurelia_wishlist");
    expect(
      /^[0-9a-f]{48}$/.test((c as JarCookie).value),
      "aurelia_wishlist value is the declared 192-bit hex token",
    ).toBe(true);
    captureForCleanup("Wishlist", "aurelia_wishlist", (c as JarCookie).value);
  });

  test("the session cookie mints with the hardened attribute set on login", async ({
    page,
  }) => {
    // Limiter budget (the api-contract precedent): 2 setup + 2 logout-spec
    // throwaway logins + 2 here (one per project) = 6 < 10 per IP+email.
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill("james@example.com");
    await page.getByLabel("Password").fill("Demo1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    const c = (await page.context().cookies()).find(
      (k) => k.name === "aurelia_session",
    );
    expect(c, "aurelia_session in the browser jar").toBeTruthy();
    expectHardened(c as JarCookie, "aurelia_session");
    // The declared `token.hmac(token)` shape (src/lib/auth.ts) — a 32-byte
    // hex token plus the base64url HMAC signature.
    expect(
      /^[0-9a-f]{64}\.[A-Za-z0-9_-]+$/.test((c as JarCookie).value),
      "aurelia_session value is the declared token.hmac shape",
    ).toBe(true);
    captureForCleanup("Session", "aurelia_session", (c as JarCookie).value);
  });

  test.afterAll(() => {
    // H-24 discipline: the rows this spec minted die with it — keyed by the
    // captured tokens, never by userId (the canonical setup sessions for the
    // demo user must survive the whole run). global-setup wipes all three
    // tables at the start of the next run regardless.
    for (const { table, token } of capturedTokens) {
      sqlRun(`DELETE FROM "${table}" WHERE token = '${token}';`);
    }
  });
});
