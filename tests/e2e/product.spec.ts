// PDP — size chips, quantity steppers, Add to Bag → drawer opens with the
// line (server-truth count), related row, wishlist toggle.
import { expect, test } from "@playwright/test";
import { CATALOG_PRODUCTS } from "../../src/lib/data/catalog";

// The PDP's related grid renders ProductCards whose hover-revealed
// "Add to Bag" buttons also match by name — scope to the main CTA (first
// in DOM order) to stay strict-mode-clean.
const mainAddToBag = (page: import("@playwright/test").Page) =>
  page.locator("main").getByRole("button", { name: "Add to Bag" }).first();

test.describe("product detail", () => {
  test("renders the first catalog product with gallery + breadcrumb", async ({ page }) => {
    await page.goto("/shop");
    await page.getByTestId("product-grid").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
    await expect(mainAddToBag(page)).toBeVisible();
    // Trust rows (shipping/returns/secure) — reference copy.
    await expect(page.getByText(/complimentary shipping/i).first()).toBeVisible();
  });

  test("size chips select and quantity steppers clamp", async ({ page }) => {
    await page.goto("/product/silk-draped-evening-gown");
    const chips = page.locator("main button[aria-pressed]");
    const first = chips.first();
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "true");

    const minus = page.getByRole("button", { name: "Decrease quantity" });
    const plus = page.getByRole("button", { name: "Increase quantity" });
    await plus.click();
    await expect(page.locator("main")).toContainText(/\b2\b/);
    // Decrement floors at 1 — the stepper disables there (oversell guard UI).
    await minus.click();
    await expect(minus).toBeDisabled();
  });

  // H-67 (session-11): the home-card exact-list pin (H-63) covers only the
  // first New-Arrivals product — ONE of the catalog's SEVEN size
  // vocabularies (letter XS–XXL, numeric 40–45 shoes, slash S/M–L/XL, and
  // One Size). This census walks EVERY catalog product's PDP and asserts the
  // rendered chip list EQUALS that product's catalog sizes (count +
  // spelling + order) — the render path (`product.sizes.map`,
  // product-detail.tsx) is shared, but the DATA (a missing/renamed size on
  // any non-first product) was unpinned until now. Chips are scoped to the
  // size block via its unique "Size Guide" sibling — the related grid's
  // ProductCards render their own aria-pressed chips and must not leak in.
  // SSR text: no clicking, so no hydration probe needed.
  //
  // L1/L2 (session-12): the block-level guard (`toHaveCount(1)`) kills the
  // vacuous pass — for a hypothetical `sizes: []` product the block never
  // renders, and BOTH the chip-count (0 === 0) and `toEqual([])` would pass
  // without the page rendering anything. Asserting the anchor exists keeps
  // the census loud for that case and for any refactor that moves the
  // `mb-6` anchor or the Size Guide sibling (the L3 coupling is
  // loud-by-design). The loop stays one test (a failure at product k
  // aborts k+1..12 in that run) to keep the documented "66 cases"
  // arithmetic — revisit only if mid-census triage ever demands it.
  test("size-vocabulary census: every PDP renders its exact catalog size list (H-67)", async ({ page }) => {
    for (const product of CATALOG_PRODUCTS) {
      await page.goto(`/product/${product.slug}`);
      const sizeBlock = page
        .locator("main div.mb-6")
        .filter({ has: page.getByRole("button", { name: "Size Guide" }) });
      await expect(sizeBlock, `size block on /product/${product.slug}`).toHaveCount(1);
      const chips = sizeBlock.locator("button[aria-pressed]");
      await expect(chips).toHaveCount(product.sizes.length);
      const labels = (await chips.allInnerTexts()).map((s) => s.trim());
      expect(labels, `size chips on /product/${product.slug}`).toEqual(product.sizes);
    }
  });

  test("Add to Bag opens the drawer with server-truth count", async ({ page }) => {
    await page.goto("/product/silk-draped-evening-gown");
    await mainAddToBag(page).click();
    const drawer = page.getByTestId("cart-drawer");
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId("cart-count")).toContainText("item");
    await expect(drawer.getByText(/silk/i).first()).toBeVisible();
  });

  test("related products render for cross-selling", async ({ page }) => {
    await page.goto("/product/silk-draped-evening-gown");
    await expect(page.getByRole("heading", { name: /You May Also/i })).toBeVisible();
    await expect(page.getByText("COMPLETE THE LOOK")).toBeVisible();
  });

  // Session 7, H-43: the quick view is the third focus-trapped surface
  // (session-6 wired it) but had NO pin. The eye button lives in the
  // hover-revealed action row; Playwright clicks it without hover (opacity-0
  // is still visible). Pin the dialog contract: focus enters the panel on
  // open and Tab wraps last→first.
  test("quick view moves focus inside and wraps Tab (H-43)", async ({ page }) => {
    await page.goto("/shop");
    const eye = page.getByRole("button", { name: /Quick view/ }).first();
    await expect(eye).toBeAttached();
    await eye.click();
    const panel = page.getByRole("dialog", { name: /Quick view/ });
    await expect(panel).toBeVisible();
    // Initial focus lives INSIDE the dialog.
    const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(inside).toBe(true);
    // Tab from the LAST focusable wraps to the first.
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"][aria-modal="true"]')!;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      items[items.length - 1].focus();
    });
    await page.keyboard.press("Tab");
    const wrapped = await page.evaluate(
      () => !!document.activeElement?.closest('div[role="dialog"][aria-modal="true"]'),
    );
    expect(wrapped).toBe(true);
  });
});
