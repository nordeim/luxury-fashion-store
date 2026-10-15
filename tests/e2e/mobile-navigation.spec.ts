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
    // P-12 (session-8): the reference REMOVED its ACCOUNT/WISHLIST tail —
    // the drawer is exactly the five reference menus now (Women, Men,
    // Accessories, Designers, Sale), still inert-looking but REAL links
    // (registered superset). If the reference re-adds a tail, restore ours.
    expect(count).toBe(5);
    const navText = (await nav.textContent()) ?? "";
    expect(navText).not.toContain("Account");
    expect(navText).not.toContain("Wishlist");

    // Every row strictly below the previous, none overlapping, real gaps.
    let previous: { y: number; height: number } | null = null;
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
      if (previous) {
        const gap = box!.y - (previous.y + previous.height);
        // gap-5 = 1.25rem = 20px; the measured reference gaps are [20,20,20,20]
        // (re-verified live, session 9). H-62: pinned to the measured BAND —
        // the old "positive gap" assert let a gap-4 (16px) regression pass.
        expect(gap).toBeGreaterThanOrEqual(19);
        expect(gap).toBeLessThanOrEqual(21);
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

  test("opening the panel moves focus inside and traps Tab (H-26)", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    const panel = page.getByRole("dialog", { name: "Site menu" });
    await expect(panel).toBeVisible();
    // Initial focus moved INTO the panel (was: left on the opener).
    const inside = await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"][aria-label="Site menu"]'),
    );
    expect(inside).toBe(true);
    // Tab from the LAST link wraps back to the first — the page behind the
    // drawer stays unreachable while the modal is open.
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Site menu"]')!;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      items[items.length - 1].focus();
    });
    await page.keyboard.press("Tab");
    const wrapped = await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"][aria-label="Site menu"]'),
    );
    expect(wrapped).toBe(true);
  });
});
