// Mobile navigation — PARITY-CRITICAL (Tailwind v4 trap pin #5).
//
// The reference panel measures:
//   panel: fixed left-0 top-0 h-full w-80 bg-background z-50 p-8
//          flex flex-col gap-6
//   nav:   flex flex-col gap-5 mt-4
//
// ⚠️ The Tailwind v4 regression this suite guards against: replacing
// `flex flex-col gap-5` with `space-y-5` (a v3-era stack). v4 rewrites the
// space-y selector to `> :not(:last-child)` margin semantics with different
// effective geometry — the panel rows collapse/shift. The pins below assert
// REAL GEOMETRY (bounding boxes), not class names, so any stack that
// visually breaks the menu fails here regardless of implementation.
import { expect, test } from "@playwright/test";

test.describe("mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await page.goto("/");
  });

  test("trigger opens the panel with the pinned geometry", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    const panel = page.getByRole("dialog", { name: "Site menu" });
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    // w-80 = 320px, full height, flush left/top.
    expect(box!.width).toBe(320);
    expect(box!.height).toBe(844);
    expect(box!.x).toBe(0);
    expect(box!.y).toBe(0);
  });

  test("nav rows stack vertically with a positive flex gap (v4 trap pin)", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: "Mobile" });
    await expect(nav).toBeVisible();
    const links = nav.locator(":scope > div > a");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(5); // reference menus + superset rows

    // Every row strictly below the previous, none overlapping, real gaps.
    let previous: { y: number; height: number } | null = null;
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
      if (previous) {
        const gap = box!.y - (previous.y + previous.height);
        // gap-5 = 1.25rem = 20px; allow sub-pixel rendering slack but
        // FAIL on zero/negative gaps (the space-y collapse signature).
        expect(gap).toBeGreaterThan(8);
      }
      previous = { y: box!.y, height: box!.height };
    }
  });

  test("uppercase tracking typography pins", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    const first = page.getByRole("navigation", { name: "Mobile" }).locator("a").first();
    await expect(first).toHaveClass(/tracking-\[0\.2em\]/);
    await expect(first).toHaveClass(/uppercase/);
  });

  test("category link navigates to a filtered PLP and closes the panel", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Women" }).click();
    await expect(page).toHaveURL(/\/shop\?category=women/);
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeHidden();
    await expect(page.getByTestId("product-grid")).toBeVisible();
  });

  test("close button and Escape dismiss the panel", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeHidden();

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeHidden();
  });

  test("backdrop click dismisses the panel", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    // The backdrop is the full-inset layer behind the 320px panel.
    await page.mouse.click(370, 400);
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeHidden();
  });
});
