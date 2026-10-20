// Search overlay — F-YY (session-54): the overlay's UI contract.
//
// The overlay is one of the reference's only three WORKING features (login,
// cart drawer, search overlay). The /api/search endpoint is exhaustively
// gated (api-contract.spec.ts + F-OO's degradation/limiter floors), but the
// COMPONENT that consumes it was wire-blind: every half below could drop
// with the full suite green — the CSP spec's "parity-safe interaction"
// (security-csp.spec.ts:170) opens the overlay but gates the CSP, not the
// overlay; shop.spec.ts:26/:42 navigates DIRECTLY by URL, bypassing the
// overlay's submit entirely.
//
// This spec pins the overlay's own contract through the real UI:
//   - the open/focus/trending half (the input FOCUSES; the five chips render)
//   - the typeahead half (typing renders the DTO's rows; the chips yield)
//   - the no-results guidance half
//   - the hit-click navigation half (a hit lands its PDP)
//   - the Enter-submit navigation half (Enter lands the filtered PLP)
//   - the trending-chip navigation half (a chip lands the filtered PLP)
//   - the dismissal half (Escape + the X button)
//
// Budget: a pure guest surface — zero logins, zero registers, zero DB
// writes; ~1 search call per case (the 200ms debounce + the >=2-char guard),
// far under the 60/min/IP bucket.
import { expect, test } from "@playwright/test";

test.describe("search overlay (F-YY, session-54)", () => {
  test("opening the overlay focuses the input and offers the trending chips", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    const overlay = page.getByTestId("search-overlay");
    await expect(overlay).toBeVisible();

    // The focus contract: the input receives focus on open (the overlay's
    // own useEffect — a dropped focus call leaves it on the opener button).
    const focusedIsInput = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") === "Search styles, brands, categories",
    );
    expect(focusedIsInput).toBe(true);

    // The TRENDING SEARCHES block at rest (q < 2 chars): label + all five
    // chips — the reference-measured resting state of the overlay. Scoped
    // to the overlay: the header's desktop nav carries its own
    // "Accessories" dropdown trigger (a strict-mode collision on the
    // unscoped locator).
    await expect(page.getByText("TRENDING SEARCHES")).toBeVisible();
    const chips = page.getByTestId("search-overlay").getByRole("button", { exact: true });
    for (const term of ["Silk Gown", "Cashmere", "Tailored Blazer", "Leather Bag", "Accessories"]) {
      await expect(chips.filter({ hasText: new RegExp(`^${term}$`) })).toBeVisible();
    }
  });

  test("typing a 2-char query renders the typeahead hits and yields the chips", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    const input = page.getByPlaceholder("Search styles, brands, categories");
    await input.fill("silk");

    // The typeahead half: the debounce + fetch + render seam. The seeded
    // catalog answers "silk" with the gown + the blouse (name contains,
    // isActive only) — each row carries the five-field DTO's brand + name +
    // price (the api-contract gate pins the DTO itself; this pins the
    // CONSUMPTION — a dropped fetch effect renders nothing and no test
    // failed before F-YY).
    const gownRow = page.locator("button", { hasText: "Silk Draped Evening Gown" });
    await expect(gownRow).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("button", { hasText: "Embroidered Silk Blouse" })).toBeVisible();
    await expect(gownRow).toContainText(/\$\d/); // the price renders

    // The q >= 2 branch: the trending block yields to the results.
    await expect(page.getByText("TRENDING SEARCHES")).toBeHidden();
  });

  test("a no-hit query shows the guidance, not a blank panel", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    await page.getByPlaceholder("Search styles, brands, categories").fill("zzzznothing9999");
    // The api-contract spec's own no-hit term — the F-12 best-effort
    // contract answers 200 + an empty set; the OVERLAY's half is the
    // rendered guidance.
    await expect(page.getByText(/No results for/i)).toBeVisible({ timeout: 10_000 });
  });

  test("clicking a hit navigates to the PDP and closes the overlay", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    await page.getByPlaceholder("Search styles, brands, categories").fill("silk");
    const gownRow = page.locator("button", { hasText: "Silk Draped Evening Gown" });
    await expect(gownRow).toBeVisible({ timeout: 10_000 });

    await gownRow.click();
    // The hit-click navigation half: the row's router.push lands the PDP
    // (a dropped handler is a silent no-op).
    await expect(page).toHaveURL(/\/product\/silk-draped-evening-gown/);
    await expect(page.getByTestId("search-overlay")).toBeHidden();
    // The product.spec.ts precedent: the PDP's own Add to Bag is main's
    // FIRST (the related-products cards below carry their own).
    await expect(page.locator("main").getByRole("button", { name: "Add to Bag" }).first()).toBeVisible();
  });

  test("Enter submits to the filtered PLP", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    const input = page.getByPlaceholder("Search styles, brands, categories");
    await input.fill("silk");
    await input.press("Enter");

    // The Enter-submit navigation half: shop.spec.ts reaches /shop?search
    // by URL — the OVERLAY's own submit path (input keydown -> submit ->
    // router.push) was never driven before F-YY.
    await expect(page).toHaveURL(/\/shop\?search=silk/);
    await expect(page.getByTestId("search-overlay")).toBeHidden();
    await expect(page.getByTestId("product-grid")).toBeVisible();
    const count = Number(
      (await page.getByTestId("result-count").textContent())?.match(/\d+/)?.[0] ?? 0,
    );
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(12);
  });

  test("a trending chip submits to the filtered PLP", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    await page.locator("button", { hasText: /^Cashmere$/ }).click();

    // The trending-chip navigation half: the chip's onClick -> submit lands
    // the filtered PLP (the chips are the reference's own measured resting
    // content; their wiring is the clone's registered superset).
    await expect(page).toHaveURL(/\/shop\?search=Cashmere/);
    await expect(page.getByTestId("search-overlay")).toBeHidden();
    await expect(page.getByTestId("product-grid")).toBeVisible();
    const count = Number(
      (await page.getByTestId("result-count").textContent())?.match(/\d+/)?.[0] ?? 0,
    );
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(12);
  });

  test("Escape and the X button dismiss the overlay", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    await expect(page.getByTestId("search-overlay")).toBeVisible();

    // The dismissal half — keyboard first.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("search-overlay")).toBeHidden();

    // Then the button.
    await page.locator("header").getByRole("button", { name: "Search" }).click();
    await expect(page.getByTestId("search-overlay")).toBeVisible();
    await page.getByRole("button", { name: "Close search" }).click();
    await expect(page.getByTestId("search-overlay")).toBeHidden();
  });
});
