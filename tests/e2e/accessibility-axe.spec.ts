/**
 * K-1 (session-16): the automated accessibility regression gate.
 * L-1 (session-17): coverage extended to the surfaces the first cut missed —
 * the logged-out /register + /wishlist, and the LOGGED-IN account / wishlist
 * (with one heart) / cart (with one line) surfaces.
 * M-1/L-3 (session-18): coverage extended behind the ADMIN role wall — the
 * admin session is MINTED OFFLINE (a session-row SQL fixture + an HMAC
 * computed with the same E2E_AUTH_SECRET the webServer carries) so the gate
 * consumes ZERO login budget; it immediately measured a real serious-class
 * violation class on /admin/products (the visibility toggle's aria-label
 * omitted the visible state word — trap #32).
 *
 * Residual #7 (carried since session 11) said: `axe-core` is an unused
 * devDependency — adopt for automated a11y audits or remove. This spec is the
 * ADOPTION: axe-core (already in node_modules) is injected into the page and
 * run against public surfaces at BOTH device projects. The gate asserts ZERO
 * axe violations (any impact) for the WCAG 2.0/2.1 A+AA ruleset.
 *
 * Excluded rule — color-contrast (documented, deliberate):
 *   The warm-paper palette (background hsl(30 15% 97%), gold hsl(42 75% 52%),
 *   muted-foreground hsl(25 10% 45%)) is the REFERENCE'S OWN measured identity
 *   (SKILL §4/§19 — gold is reserved for SALE/stars/focus). The parity law
 *   (CLAUDE.md) forbids restyling parity surfaces, so the brand-look contrast
 *   findings are accepted by design — the reference fails the same rule on the
 *   same nodes. Everything the gate CAN fix must stay fixed.
 *
 * Auth hygiene (AGENTS.md): the logged-out surfaces opt out of the
 * per-project storageState with an empty one; the logged-in surfaces reuse
 * the per-project storageState (the demo customer's canonical session, saved
 * once by the setup projects) — ZERO extra logins, zero rate-budget
 * consumption. The two stateful surfaces create their own fixture state
 * (one wishlist heart / one cart line via the PDP) and clean up after
 * themselves (suite-wide shared-DB discipline). The admin surfaces mint a
 * session ROW via SQL (the H-2 `prisma db execute` pattern) — no login call
 * ever happens, so the exactly-consumed admin bucket (SKILL §9 #23) is left
 * untouched, and the row is deleted again in afterAll.
 */
import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { E2E_AUTH_SECRET } from "./e2e-secrets";

const AXE_SRC = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const LOGGED_OUT_SURFACES: Array<[string, string]> = [
  ["/", "home"],
  ["/shop", "shop"],
  ["/product/silk-draped-evening-gown", "pdp"],
  ["/cart", "cart (empty)"],
  ["/login", "login"],
  ["/register", "register"],
  ["/wishlist", "wishlist (logged out)"],
];

// Deterministic axe run on the CURRENT page; returns "id(impact)×nodes" pairs.
async function axeSummary(page: import("@playwright/test").Page): Promise<string[]> {
  await page.addScriptTag({ path: AXE_SRC });
  const results = await page.evaluate(() =>
    // window.axe is typed by axe-core's own d.ts once injected; the
    // evaluated context is untyped here, hence the narrow any-cast.
    (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: unknown[] }> }> } }).axe.run(
      document,
      {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        rules: { "color-contrast": { enabled: false } }, // parity-law exclusion, see header
      }
    )
  );
  return results.violations.map((v) => `${v.id}(${v.impact})×${v.nodes.length}`);
}

test.describe("accessibility axe gate (K-1 + L-1)", () => {
  // N-1 (session-19): the production CSP is nonce-only — the axe SCRIPT this
  // gate injects (test harness, not app code) has no nonce, so the context
  // opts out of CSP enforcement. Nothing else relies on it; every app-level
  // script carries the proxy's nonce (security-csp.spec.ts pins that).
  test.use({ bypassCSP: true });

  test.describe("logged-out surfaces (empty storageState)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const [route, name] of LOGGED_OUT_SURFACES) {
      test(`zero WCAG 2.0/2.1 A+AA violations on ${name}`, async ({ page }) => {
        await page.goto(route, { waitUntil: "load" });
        const summary = await axeSummary(page);
        expect(summary, `axe violations on ${name}: ${summary.join(", ")}`).toEqual([]);
      });
    }
  });

  test.describe("logged-in surfaces (per-project session — zero extra logins)", () => {
    test("zero violations on account (logged in)", async ({ page }) => {
      await page.goto("/account", { waitUntil: "load" });
      const summary = await axeSummary(page);
      expect(summary, `axe violations on account: ${summary.join(", ")}`).toEqual([]);
    });

    test("zero violations on wishlist with one heart (logged in, self-cleaning)", async ({ page }) => {
      // Fixture: one wishlist row via the PDP heart (normalize first — the
      // suite shares one DB and the seeded user may already hold this piece).
      await page.goto("/product/silk-draped-evening-gown", { waitUntil: "load" });
      const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
      if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
        await wishBtn.click();
        await expect(wishBtn).toHaveText(/Add to Wishlist/i, { timeout: 10_000 });
      }
      await wishBtn.click();
      await expect(wishBtn).toHaveText(/In Wishlist/i, { timeout: 10_000 });

      await page.goto("/wishlist", { waitUntil: "load" });
      const summary = await axeSummary(page);
      expect(summary, `axe violations on wishlist (authed): ${summary.join(", ")}`).toEqual([]);

      // Cleanup: toggle the heart back off (shared canonical wishlist).
      await page.goto("/product/silk-draped-evening-gown", { waitUntil: "load" });
      await wishBtn.click();
      await expect(wishBtn).toHaveText(/Add to Wishlist/i, { timeout: 10_000 });
    });

    test("zero violations on cart with one line (logged in, self-cleaning)", async ({ page }) => {
      // Fixture: one cart line via the PDP CTA (H-27 discipline applies to
      // the cleanup loop — wait for THAT row to detach, never sleep-and-pray).
      await page.goto("/product/silk-draped-evening-gown", { waitUntil: "load" });
      await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
      await expect(page.getByTestId("cart-drawer")).toBeVisible();

      await page.goto("/cart", { waitUntil: "load" });
      const summary = await axeSummary(page);
      expect(summary, `axe violations on cart (1 line): ${summary.join(", ")}`).toEqual([]);

      // Cleanup: empty the bag (the canonical state the suite starts from).
      for (;;) {
        const remove = page.getByRole("button", { name: /remove/i }).first();
        if (!(await remove.isVisible().catch(() => false))) break;
        const lineCount = await page.getByTestId("cart-line").count();
        await remove.click();
        if (lineCount > 0) {
          await expect(page.getByTestId("cart-line")).toHaveCount(lineCount - 1, { timeout: 10_000 });
        }
      }
    });
  });

  test.describe("admin surfaces (SQL-minted admin session — zero logins)", () => {
    // M-1/L-3 (session-18): the axe gate now audits the surfaces behind the
    // admin role wall WITHOUT a single login call — the exactly-consumed
    // admin bucket (SKILL §9 #23) stays untouched. The session cookie is
    // minted offline: a random 256-bit token, HMAC'd with the SAME
    // E2E_AUTH_SECRET the webServer env carries (e2e-secrets.ts), backed by a
    // Session row inserted via `prisma db execute` against db/e2e.db (the
    // proven H-2 fixture pattern). Verification in src/lib/auth.ts checks the
    // HMAC before any DB hit, and the row lookup resolves to the seeded
    // admin user — the request is indistinguishable from a logged-in admin.
    const ADMIN_TOKEN = randomBytes(32).toString("hex");
    const adminStorageState = {
      cookies: [
        {
          name: "aurelia_session",
          value: `${ADMIN_TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET)
            .update(ADMIN_TOKEN)
            .digest("base64url")}`,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false, // http://localhost — matches the setup projects' minted cookies
          sameSite: "Lax" as const,
          expires: Math.floor(Date.now() / 1000) + 86_400,
        },
      ],
      origins: [],
    };

    test.use({ storageState: adminStorageState });

    function adminSqlRun(sql: string) {
      const file = path.join(process.cwd(), "tests", "e2e", ".admin-axe-session.sql");
      writeFileSync(file, sql);
      execSync(`npx prisma db execute --schema ${path.join(process.cwd(), "prisma", "schema.prisma")} --file ${file}`, {
        env: { ...process.env, DATABASE_URL: `file:${path.join(process.cwd(), "db", "e2e.db")}` },
        stdio: "pipe",
      });
      unlinkSync(file);
    }

    test.beforeAll(() => {
      // INSERT ... SELECT: the seeded admin's id is resolved by the DB itself
      // (never hardcoded). The session id is derived from the per-run token
      // (F-A, session-19) — collision-free even if two projects ever ran
      // concurrently (workers > 1); re-runs are idempotent (delete-then-insert),
      // and global-setup wipes every session row before each full suite anyway.
      adminSqlRun(
        `DELETE FROM "Session" WHERE token = '${ADMIN_TOKEN}';\n` +
          `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
          `SELECT 'admin-axe-gate-' || '${ADMIN_TOKEN}', '${ADMIN_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
          `FROM "User" WHERE email = 'admin@aurelia.com';`
      );
    });

    test.afterAll(() => {
      // Self-cleaning (suite hygiene): the minted row dies with the group.
      adminSqlRun(`DELETE FROM "Session" WHERE token = '${ADMIN_TOKEN}';`);
    });

    const ADMIN_SURFACES: Array<[string, string]> = [
      ["/admin", "admin dashboard"],
      ["/admin/products", "admin products"],
      ["/admin/orders", "admin orders"],
    ];

    for (const [route, name] of ADMIN_SURFACES) {
      test(`zero WCAG 2.0/2.1 A+AA violations on ${name}`, async ({ page }) => {
        await page.goto(route, { waitUntil: "load" });
        const summary = await axeSummary(page);
        expect(summary, `axe violations on ${name}: ${summary.join(", ")}`).toEqual([]);
      });
    }

    test("zero violations on admin order detail", async ({ page }) => {
      // The canonical seed always leaves 4 orders — navigate through the
      // first detail link rather than hardcoding a cuid (L-2's lesson).
      await page.goto("/admin/orders", { waitUntil: "load" });
      const first = page.locator('a[href^="/admin/orders/"]').first();
      await expect(first).toBeVisible();
      const href = await first.getAttribute("href");
      expect(href, "admin order detail link href").toBeTruthy();
      await page.goto(href as string, { waitUntil: "load" });
      const summary = await axeSummary(page);
      expect(summary, `axe violations on admin order detail: ${summary.join(", ")}`).toEqual([]);
    });
  });
});
