/**
 * K-1 (session-16): the automated accessibility regression gate.
 * L-1 (session-17): coverage extended to the surfaces the first cut missed —
 * the logged-out /register + /wishlist, and the LOGGED-IN account / wishlist
 * (with one heart) / cart (with one line) surfaces.
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
 * themselves (suite-wide shared-DB discipline).
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

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
});
