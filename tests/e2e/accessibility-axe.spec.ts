/**
 * K-1 (session-16): the automated accessibility regression gate.
 *
 * Residual #7 (carried since session 11) said: `axe-core` is an unused
 * devDependency — adopt for automated a11y audits or remove. This spec is the
 * ADOPTION: axe-core (already in node_modules) is injected into the page and
 * run against the public logged-out surfaces at BOTH device projects. The gate
 * asserts ZERO axe violations (any impact) for the WCAG 2.0/2.1 A+AA ruleset.
 *
 * Excluded rule — color-contrast (documented, deliberate):
 *   The warm-paper palette (background hsl(30 15% 97%), gold hsl(42 75% 52%),
 *   muted-foreground hsl(25 10% 45%)) is the REFERENCE'S OWN measured identity
 *   (SKILL §4/§19 — gold is reserved for SALE/stars/focus). The parity law
 *   (CLAUDE.md) forbids restyling parity surfaces, so the brand-look contrast
 *   findings are accepted by design — the reference fails the same rule on the
 *   same nodes. Everything the gate CAN fix must stay fixed.
 *
 * Auth hygiene (AGENTS.md): these surfaces are public; the spec opts out of
 * the per-project storageState with an empty one — zero logins, zero
 * rate-budget consumption.
 */
import { test, expect } from "@playwright/test";
import path from "node:path";

const AXE_SRC = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const SURFACES: Array<[string, string]> = [
  ["/", "home"],
  ["/shop", "shop"],
  ["/product/silk-draped-evening-gown", "pdp"],
  ["/cart", "cart (empty)"],
  ["/login", "login"],
];

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("accessibility axe gate (K-1)", () => {
  for (const [route, name] of SURFACES) {
    test(`zero WCAG 2.0/2.1 A+AA violations on ${name}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
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
      const summary = results.violations.map((v) => `${v.id}(${v.impact})×${v.nodes.length}`);
      expect(summary, `axe violations on ${name}: ${summary.join(", ")}`).toEqual([]);
    });
  }
});
