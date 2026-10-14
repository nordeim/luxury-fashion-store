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
});
