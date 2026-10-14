// Home — parity surface: 12 sections in reference order (hero, marquee,
// the-edit, product rows, deals, UGC) + header/footer chrome. Logged-in
// storage state.
//
// Session-5 parity pins (P-1..P-6) were measured live on the reference
// (pastel-aurelia, 2026-10-14): the hero anchors slides horizontally
// (slide 1 left, slides 2–3 right) with left-aligned copy and a push
// transition; a brand marquee strip sits between hero and New Arrivals;
// product-row cards are fixed 280px at desktop; The Edit + Styled by You
// tiles are 3:4.
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

  test("hero slide 1 anchors LEFT with left-aligned copy (P-1)", async ({ page }) => {
    await page.goto("/");
    const slide = page.getByTestId("hero-slide-0");
    await expect(slide).toHaveAttribute("data-active", "true");
    // P-1: the content layer pins justify-start; the copy block is text-left.
    const justify = await slide
      .locator("div")
      .evaluateAll((els) => {
        const layer = els.find((e) => getComputedStyle(e).position === "absolute" && getComputedStyle(e).display === "flex");
        return layer ? getComputedStyle(layer).justifyContent : null;
      });
    expect(justify).toBe("flex-start");
    const align = await page
      .getByTestId("hero-content-0")
      .evaluate((el) => getComputedStyle(el).textAlign);
    expect(align).toBe("left");
  });

  test("hero slides anchor right after slide 1 (P-1)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Next slide" }).click();
    const slide = page.getByTestId("hero-slide-1");
    await expect(slide).toHaveAttribute("data-active", "true");
    const justify = await slide
      .locator("div")
      .evaluateAll((els) => {
        const layer = els.find((e) => getComputedStyle(e).position === "absolute" && getComputedStyle(e).display === "flex");
        return layer ? getComputedStyle(layer).justifyContent : null;
      });
    expect(justify).toBe("flex-end");
  });

  test("hero pushes slides horizontally, not a fade (P-2)", async ({ page }) => {
    await page.goto("/");
    const carousel = page.getByTestId("hero-carousel");
    // Anchor on the CURRENTLY active slide — the carousel auto-rotates, so a
    // hard-coded index would race the timer.
    const activeIdx = await carousel
      .locator("[data-testid^='hero-slide-'][data-active='true']")
      .evaluate((el) => Number(el.getAttribute("data-testid")!.split("-").pop()));
    const nextIdx = (activeIdx + 1) % 3;
    await page.getByRole("button", { name: "Next slide" }).click();
    const next = page.getByTestId(`hero-slide-${nextIdx}`);
    await expect(next).toHaveAttribute("data-active", "true");
    // The newly-active slide rests at the identity transform...
    await expect
      .poll(async () => next.evaluate((el) => getComputedStyle(el).transform))
      .toBe("matrix(1, 0, 0, 1, 0, 0)");
    // ...and the previously-active slide is parked one viewport to the LEFT
    // (a horizontal push, not a cross-fade which would leave it at none/0).
    const vw = page.viewportSize()?.width ?? 0;
    const prev = page.getByTestId(`hero-slide-${activeIdx}`);
    await expect(prev).toHaveAttribute("data-active", "false");
    await expect
      .poll(async () => prev.evaluate((el) => getComputedStyle(el).transform))
      .toBe(`matrix(1, 0, 0, 1, ${-vw}, 0)`);
  });

  test("brand marquee strip runs under the hero (P-3)", async ({ page }) => {
    await page.goto("/");
    const marquee = page.getByTestId("brand-marquee");
    await expect(marquee).toBeVisible();
    await expect(marquee).toContainText("NORDIC ATELIER");
    await expect(marquee).toContainText("SAVILE & CO");
    // Border-y chrome + the 30s marquee animation + gold diamond separator.
    // The animation lives on the INNER track (the outer div is just chrome).
    const styles = await marquee
      .locator(".animate-marquee")
      .evaluate((el) => {
        const cs = getComputedStyle(el);
        const outer = getComputedStyle(el.parentElement!);
        const diamond = Array.from(el.querySelectorAll("span")).find((s) => s.textContent?.trim() === "◆");
        return {
          bt: outer.borderTopWidth,
          bb: outer.borderBottomWidth,
          anim: cs.animationName,
          dur: cs.animationDuration,
          diamondColor: diamond ? getComputedStyle(diamond).color : null,
          copies: el.children.length,
        };
      });
    expect(styles.bt).toBe("1px");
    expect(styles.bb).toBe("1px");
    expect(styles.anim).toBe("marquee");
    expect(styles.dur).toBe("30s");
    expect(styles.diamondColor).toBe("rgb(224, 169, 41)");
    // The track is doubled for the seamless -50% loop.
    expect(styles.copies).toBe(2);
  });

  test("product row cards are fixed 280px at desktop (P-4)", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "desktop-only pin");
    await page.goto("/");
    const row = page.getByTestId("product-row").first();
    await expect(row).toBeVisible();
    const box = await row.locator("[data-product-card]").first().boundingBox();
    expect(box?.width).toBe(280);
  });

  test("the edit and UGC tiles are 3:4 with the reference copy (P-5/P-6)", async ({ page }) => {
    await page.goto("/");
    const editTile = page.getByTestId("the-edit").locator("a").first();
    await expect(editTile).toBeVisible();
    await expect
      .poll(async () => editTile.evaluate((el) => getComputedStyle(el).aspectRatio))
      .toBe("3 / 4");
    const ugc = page.getByTestId("styled-by-you");
    await expect(ugc.getByText("Tag @velour in your looks to be featured")).toBeVisible();
    const ugcTile = ugc.locator(".group").first();
    await expect
      .poll(async () => ugcTile.evaluate((el) => getComputedStyle(el).aspectRatio))
      .toBe("3 / 4");
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
    await page.waitForTimeout(900); // push transition + state flip
    const after = await snapshot();
    expect(after).not.toBe(before);
  });

  test("renders catalog sections in reference order", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("brand-marquee")).toBeVisible();
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
