// Homepage navigation chrome — F-ZZ (session-55): every navigation
// affordance on the resting homepage EXCEPT the hero's Next arrow was
// wire-blind. home.spec.ts pins the hero's geometry (P-1/P-2/P-8) and clicks
// Next five times across its cases, but nothing anywhere clicked:
//   - the hero's Previous control (the negative-modulo wrap arm)
//   - the hero's slide-indicator dots ("Go to slide N")
//   - the Next WRAP (slide 3 -> slide 1 — a clamp regression lands silently)
//   - the live counter "NN / 03" (never asserted)
//   - the hero CTA (the wishlist spec's "Discover the Collection" is the
//     WISHLIST empty state, not the hero)
//   - the product-row scroller arrows ("Scroll <row> back/forward")
//   - the desktop mega menu (hover-open + the dual-param subcategory links)
//   - the header's Designers/Sale links (shop.spec reaches ?sale=1 by URL)
//   - the Edit card links (home.spec:169 reads the tile for GEOMETRY only)
// Every one of those halves could drop with the full suite green — the
// silent class. This spec is their owning gate (the file-per-surface
// convention: the drawer owns mobile-navigation.spec.ts, the overlay owns
// search-overlay.spec.ts, the homepage's navigation chrome owns this file;
// home.spec.ts stays the geometry/rendering owner).
//
// Budget: a pure guest surface — zero logins, zero registers, zero DB
// writes, zero limiter consumption (navigation only).
import { expect, test } from "@playwright/test";

test.describe("homepage navigation chrome (F-ZZ, session-55)", () => {
  // The counter + active-slide locators shared by the hero cases. Slide
  // identity is asserted via data-active (flips synchronously with the
  // click — never the 700ms transform), and the counter via its exact text
  // (the reference-measured "NN / 03" chrome).
  const counter = (page: import("@playwright/test").Page) =>
    page.getByTestId("hero-carousel").locator("div.absolute.bottom-8.right-10");
  const activeSlide = (page: import("@playwright/test").Page) =>
    page.getByTestId("hero-carousel").locator('[data-active="true"]');

  test("the hero's Previous control steps backward and wraps to the last slide", async ({ page }) => {
    await page.goto("/");
    await expect(counter(page)).toHaveText("01 / 03");

    // The negative-modulo arm: go(active - 1) from slide 1 must WRAP to
    // slide 3 (((-1 % 3) + 3) % 3 = 2). A naive `next % count` renders
    // active = -1: NO slide active, counter "00 / 03" — the crash class.
    //
    // Auto-rotate hardening: the post-click asserts use a 2.5s window and
    // 2-tick-resistant expected states (a forward tick from slide 1 gives
    // slide 2, never slide 3; two ticks need 12s) — the 6s auto-rotate can
    // never rescue a dead control inside the window (the vacuous-rescue
    // class this spec's own first dot-drop demo caught live).
    await page.getByRole("button", { name: "Previous slide" }).click();
    await expect(activeSlide(page)).toHaveAttribute("data-testid", "hero-slide-2", { timeout: 2500 });
    await expect(counter(page)).toHaveText("03 / 03", { timeout: 2500 });

    // The ordinary backward step: slide 3 -> slide 2 (one forward tick from
    // slide 3 lands slide 1, never slide 2 — 2-tick-resistant again).
    await page.getByRole("button", { name: "Previous slide" }).click();
    await expect(activeSlide(page)).toHaveAttribute("data-testid", "hero-slide-1", { timeout: 2500 });
    await expect(counter(page)).toHaveText("02 / 03", { timeout: 2500 });
  });

  test("the hero's indicator dots jump to their slide", async ({ page }) => {
    await page.goto("/");
    // Ordered for tick-resistance: from rest, "Go to slide 3" (idx 2)
    // needs TWO forward ticks (12s) to fake; from slide 3, "Go to slide 2"
    // (idx 1) likewise needs two. With 2.5s assert windows the 6s
    // auto-rotate can never rescue a dead dot (the first dot-drop demo's
    // live lesson — the default 10s window let one tick fake the jump).
    await page.getByRole("button", { name: "Go to slide 3" }).click();
    await expect(activeSlide(page)).toHaveAttribute("data-testid", "hero-slide-2", { timeout: 2500 });
    await expect(counter(page)).toHaveText("03 / 03", { timeout: 2500 });

    await page.getByRole("button", { name: "Go to slide 2" }).click();
    await expect(activeSlide(page)).toHaveAttribute("data-testid", "hero-slide-1", { timeout: 2500 });
    await expect(counter(page)).toHaveText("02 / 03", { timeout: 2500 });
  });

  test("the hero's Next control wraps from the last slide back to the first", async ({ page }) => {
    await page.goto("/");
    // Two Next clicks reach slide 3 — the INTERMEDIATE assert proves Next
    // is live (a dead Next can't be faked to idx 2 by fewer than two
    // forward ticks) — and the third click exercises the modulo's positive
    // arm: a clamp-shaped regression (Math.min(next, count - 1)) sticks on
    // slide 3 and lands silently. manual()'s timer reset keeps consecutive
    // clicks deterministic (each control click re-arms the 6s auto-rotate;
    // the gaps here are far under). The 2.5s assert windows close long
    // before any rescue tick.
    const next = page.getByRole("button", { name: "Next slide" });
    await next.click();
    await page.waitForTimeout(150);
    await next.click();
    await page.waitForTimeout(150);
    await expect(activeSlide(page)).toHaveAttribute("data-testid", "hero-slide-2", { timeout: 2500 });
    await expect(counter(page)).toHaveText("03 / 03", { timeout: 2500 });
    await next.click();
    await page.waitForTimeout(250);
    await expect(activeSlide(page)).toHaveAttribute("data-testid", "hero-slide-0", { timeout: 2500 });
    await expect(counter(page)).toHaveText("01 / 03", { timeout: 2500 });
  });

  test("the active hero CTA lands the PLP", async ({ page }) => {
    await page.goto("/");
    // Scoped to the ACTIVE slide: the inert slides carry the same CTA
    // markup (strict mode — and only the active slide's CTA is clickable).
    const cta = page.getByTestId("hero-carousel").locator('div[data-active="true"]').getByRole("link");
    await cta.click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByTestId("product-grid")).toBeVisible();
  });

  test("the product-row scroller arrows scroll the row and return", async ({ page }) => {
    await page.goto("/");
    // The product-row testid sits ON the scroller itself (home.spec.ts:443's
    // own comment). The first row is "New Arrivals"; its arrows scroll by
    // two cards + the two 24px gaps (the measured delta).
    const scroller = page.getByTestId("product-row").first();
    await scroller.scrollIntoViewIfNeeded();
    await expect(scroller).toBeVisible();

    await page.getByRole("button", { name: "Scroll New Arrivals forward" }).click();
    await expect
      .poll(async () => scroller.evaluate((el) => Math.round(el.scrollLeft)), { timeout: 5000 })
      .toBeGreaterThan(100);

    await page.getByRole("button", { name: "Scroll New Arrivals back" }).click();
    await expect
      .poll(async () => scroller.evaluate((el) => Math.round(el.scrollLeft)), { timeout: 5000 })
      .toBeLessThan(40);
  });

  test("the mega menu's subcategory link lands the dual-param PLP", async ({ page }) => {
    // Desktop-only: the Main nav is hidden below lg (home.spec.ts:72's own
    // skip pattern — joins the standing desktop-only-pin skips).
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "desktop-only pin");
    await page.goto("/");
    const mainNav = page.getByRole("navigation", { name: "Main" });

    // The hover-open half: the dropdown renders via CSS group-hover.
    await mainNav.getByRole("button", { name: "Women" }).hover();
    const dresses = mainNav.getByRole("link", { name: "Dresses" });
    await expect(dresses).toBeVisible();

    // The dual-param navigation half: the link's href carries BOTH the
    // category and the search term — a dropped/mangled href (or a dead
    // dropdown) navigates nowhere while every existing case stays green.
    await dresses.click();
    await expect(page).toHaveURL(/category=women&search=Dresses/);
    await expect(page.getByTestId("product-grid")).toBeVisible();
    const count = Number(
      (await page.getByTestId("result-count").textContent())?.match(/\d+/)?.[0] ?? 0,
    );
    expect(count).toBeGreaterThan(0); // the seeded gown (subcategory "dresses")
    expect(count).toBeLessThan(12);
  });

  test("the header's Sale link lands the sale PLP", async ({ page }) => {
    // Desktop-only: the Secondary nav is hidden below lg.
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "desktop-only pin");
    await page.goto("/");
    // shop.spec.ts:34 reaches /shop?sale=1 by DIRECT URL — the LINK's own
    // navigation was never driven before F-ZZ.
    await page.getByRole("navigation", { name: "Secondary" }).getByRole("link", { name: "Sale" }).click();
    await expect(page).toHaveURL(/sale=1/);
    // The sale marker: every sale piece renders the struck-through
    // compare-at price (shop.spec.ts's own assertion shape).
    await expect(page.getByTestId("product-grid").locator(".line-through").first()).toBeVisible();
  });

  test("an Edit card lands its category PLP", async ({ page }) => {
    await page.goto("/");
    // The first card is Women (CATEGORY_CARDS[0].id = "women"). home.spec
    // reads this tile for GEOMETRY (3:4 aspect); the navigation half — the
    // card's href — was never clicked before F-ZZ.
    const card = page.getByTestId("the-edit").locator("a").first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page).toHaveURL(/\/shop\?category=women/);
    await expect(page.getByTestId("product-grid")).toBeVisible();
  });
});
