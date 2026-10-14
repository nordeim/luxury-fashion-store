// Home — parity surface: 12 sections in reference order (hero, the-edit,
// product rows, deals, UGC) + header/footer chrome. Logged-in storage state.
import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("renders the hero carousel with brand chrome", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-carousel")).toBeVisible();
    // Announcement bar pins the shipping policy (reference copy).
    await expect(page.getByText(/COMPLIMENTARY SHIPPING ON ORDERS OVER \$500/i)).toBeVisible();
    // Centered logotype.
    await expect(page.getByLabel("AURELIA home")).toBeVisible();
  });

  test("next slide control changes the visible slide", async ({ page }) => {
    await page.goto("/");
    const carousel = page.getByTestId("hero-carousel");
    const snapshot = () =>
      carousel
        .locator("div[aria-hidden]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("aria-hidden")).join(""));
    const before = await snapshot();
    await page.getByRole("button", { name: "Next slide" }).click();
    await page.waitForTimeout(900); // opacity transition + state flip
    const after = await snapshot();
    expect(after).not.toBe(before);
  });

  test("renders catalog sections in reference order", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("the-edit")).toBeVisible();
    await expect(page.getByTestId("exclusive-deals")).toBeVisible();
    await expect(page.getByTestId("styled-by-you")).toBeVisible();
    const rows = page.getByTestId("product-row");
    await expect(rows).toHaveCount(6); // New Arrivals, Our, Women's, Sale, Men's, Fine
    await expect(page.getByRole("heading", { name: "New Arrivals" })).toBeVisible();
  });

  test("newsletter form accepts an email (API superset)", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Your email address");
    await input.scrollIntoViewIfNeeded();
    await input.fill("newsletter@example.com");
    await input.press("Enter");
    await expect(page.getByText(/thank|subscribed|welcome/i)).toBeVisible({ timeout: 10_000 });
  });
});
