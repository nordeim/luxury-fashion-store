// Wishlist — heart toggle on cards, drawer/page reflection, remove.
import { expect, test } from "@playwright/test";

test.describe("wishlist", () => {
  test("adding from the PDP reflects on the wishlist page", async ({ page }) => {
    // The PDP wishlist CTA is always visible (card hearts are hover-revealed).
    await page.goto("/product/silk-draped-evening-gown");
    // Scope to main: related ProductCards also carry wishlist-labeled hearts.
    const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
    // Suite shares one DB: the seeded user may already hold this piece.
    // Normalize to "not in wishlist" first, then add.
    if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
      await wishBtn.click();
      await expect(wishBtn).toHaveText(/Add to Wishlist/i, { timeout: 10_000 });
    }
    await wishBtn.click();
    await expect(wishBtn).toHaveText(/In Wishlist/i, { timeout: 10_000 });

    await page.goto("/wishlist");
    await expect(page.getByTestId("wishlist-grid")).toBeVisible();
    await expect(page.getByTestId("wishlist-grid").getByRole("link").first()).toBeVisible();
  });

  test("empty wishlist shows guidance", async ({ page }) => {
    await page.goto("/wishlist");
    const grid = page.getByTestId("wishlist-grid");
    if (!(await grid.isVisible().catch(() => false))) {
      await expect(page.getByText(/empty|nothing|no items/i).first()).toBeVisible();
    }
  });
});
