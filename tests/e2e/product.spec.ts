// PDP — size chips, quantity steppers, Add to Bag → drawer opens with the
// line (server-truth count), related row, wishlist toggle.
import { expect, test } from "@playwright/test";

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
