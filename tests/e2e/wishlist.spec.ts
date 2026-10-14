// Wishlist — heart toggle on cards, drawer/page reflection, remove.
import { expect, test } from "@playwright/test";

const loggedOut = { storageState: { cookies: [], origins: [] } };

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
});

// H-38 (session-6): the empty-state test runs in its OWN describe on a
// logged-out context — a cookie-fresh guest wishlist is empty, so the
// guidance branch is asserted deterministically (the old variant ran on the
// project session right after the add test: grid visible + `if` without
// else = vacuous green).
test.describe("wishlist (empty state)", () => {
  test.use(loggedOut);

  test("empty wishlist shows guidance", async ({ page }) => {
    await page.goto("/wishlist");
    const grid = page.getByTestId("wishlist-grid");
    if (await grid.isVisible().catch(() => false)) {
      // Defense-in-depth: if a run ever leaks wishlist state into a fresh
      // guest context, fail loudly instead of passing vacuously.
      throw new Error("guest wishlist should be empty — transient-state leak");
    }
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
    await expect(page.getByRole("link", { name: /Discover the Collection/i })).toBeVisible();
  });
});
