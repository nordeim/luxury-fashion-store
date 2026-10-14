// Shop (PLP) — the first functional superset page: working category chips,
// price buckets, sort, sale toggle, search, and URL sync. Result count pins
// the seeded catalog size (12 products).
import { expect, test } from "@playwright/test";

test.describe("shop", () => {
  test("shows the full catalog by default", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByTestId("product-grid")).toBeVisible();
    await expect(page.getByTestId("result-count")).toContainText("12");
  });

  test("category chips filter and sync the URL", async ({ page }) => {
    await page.goto("/shop");
    // Scope to main: the header also has a "Women" dropdown trigger button.
    await page.locator("main").getByRole("button", { name: "Women", exact: true }).click();
    await expect(page).toHaveURL(/category=women/);
    const count = Number(
      (await page.getByTestId("result-count").textContent())?.match(/\d+/)?.[0] ?? 0,
    );
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(12);
  });

  test("search narrows results", async ({ page }) => {
    await page.goto("/shop?search=silk");
    await expect(page.getByTestId("result-count")).toBeVisible();
    const count = await page.getByTestId("result-count").textContent();
    expect(Number(count?.match(/\d+/)?.[0] ?? 0)).toBeLessThan(12);
    expect(Number(count?.match(/\d+/)?.[0] ?? 0)).toBeGreaterThan(0);
  });

  test("sale toggle shows only marked-down pieces", async ({ page }) => {
    await page.goto("/shop?sale=1");
    await expect(page).toHaveURL(/sale=1/);
    // Every sale piece renders the struck-through compare-at price.
    const grid = page.getByTestId("product-grid");
    await expect(grid.locator(".line-through").first()).toBeVisible();
  });

  test("clear filters restores the full catalog", async ({ page }) => {
    await page.goto("/shop?search=silk");
    await page.getByRole("button", { name: "Clear all filters" }).click();
    await expect(page.getByTestId("result-count")).toContainText("12");
  });
});
