// Home — parity surface: 12 sections in reference order (hero, marquee,
// the-edit, product rows, deals, UGC) + header/footer chrome. Logged-in
// storage state.
//
// Session-5 parity pins (P-1..P-6) were measured live on the reference
// (pastel-aurelia, 2026-10-14): the hero anchors slides horizontally
// (slide 1 left, slide 2 right) with left-aligned copy and a push
// transition; a brand marquee strip sits between hero and New Arrivals;
// product-row cards are fixed 280px at desktop; The Edit + Styled by You
// tiles are 3:4.
//
// Session-6 re-measure (P-8, same day, later capture): the reference
// RE-ANCHORED slide 3 to the horizontal center with center-aligned copy
// (slides 1–2 unchanged). Latest measurement wins — the pin below enforces it.
//
// Session-7 re-measure (P-9/P-10, 2026-10-15): the deals section became a
// countdown + bento + inline sale grid (standalone Sale row absorbed); the
// product card grew a name-adjacent swatch row, stroke stars, a -{discount}%
// image chip and dropped the "NEW" chip. Pins below enforce all of it.
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

  test("hero slide 3 anchors CENTER with centered copy (P-8)", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "desktop-only pin");
    await page.goto("/");
    // Slides rotate every 6s; drive to slide 3 deterministically.
    await page.getByRole("button", { name: "Next slide" }).click();
    await page.getByRole("button", { name: "Next slide" }).click();
    const slide = page.getByTestId("hero-slide-2");
    await expect(slide).toHaveAttribute("data-active", "true");
    const justify = await slide
      .locator("div")
      .evaluateAll((els) => {
        const layer = els.find((e) => getComputedStyle(e).position === "absolute" && getComputedStyle(e).display === "flex");
        return layer ? getComputedStyle(layer).justifyContent : null;
      });
    expect(justify).toBe("center");
    const align = await page
      .getByTestId("hero-content-2")
      .evaluate((el) => getComputedStyle(el).textAlign);
    expect(align).toBe("center");
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
    // P-9 (session-7): the standalone Sale row is GONE — the sale grid lives
    // inside exclusive-deals. Five rows remain.
    const rows = page.getByTestId("product-row");
    await expect(rows).toHaveCount(5); // New Arrivals, Our, Women's, Men's, Fine
    await expect(page.getByRole("heading", { name: "New Arrivals" })).toBeVisible();
    // The sale area renders inside the deals section: heading + 6 sale cards.
    const deals = page.getByTestId("exclusive-deals");
    await expect(deals.getByRole("heading", { name: "Sale Items" })).toBeVisible();
    await expect(deals.getByTestId("sale-grid").locator("[data-product-card]")).toHaveCount(6);
  });

  test("exclusive deals runs a live countdown, bento tiles and the sale grid (P-9)", async ({ page }) => {
    await page.goto("/");
    const deals = page.getByTestId("exclusive-deals");
    // Countdown: three ink digit boxes over cormorant digits, ticking real
    // seconds (the reference's own countdown is mount-relative and ticks —
    // the clone matches the semantics, superset-documented).
    const countdown = deals.getByTestId("sale-countdown");
    await expect(countdown).toBeVisible();
    // Digits carry their unit suffixes (08HRS:24MIN:00SEC). The server
    // placeholder is 08:24:00 — real hydration starts the tick; poll until
    // the text moves (2s window always catches a second flip once live).
    const readCd = () => countdown.evaluate((el) => el.textContent ?? "");
    const s0 = await readCd();
    await expect.poll(readCd, { timeout: 10_000 }).not.toBe(s0); // real seconds elapsed
    const s1 = await readCd();
    expect(s1).toMatch(/\d{2}HRS:\d{2}MIN:\d{2}SEC/);
    const boxes = await countdown.evaluate((el) => {
      const parts = Array.from(el.querySelectorAll("div"));
      const ink = parts.filter((d) => getComputedStyle(d).backgroundColor === "rgb(23, 20, 17)");
      return { count: ink.length, w: ink.length ? Math.round(ink[0].getBoundingClientRect().width) : 0 };
    });
    expect(boxes.count).toBe(3);
    expect(boxes.w).toBe(48);
    // Bento: the featured deal + two stacked — the tall tile's h3 is 36px at
    // desktop, the stacked ones 30px (both white on gradient).
    await expect(deals.getByRole("heading", { name: "Up to 40% Off" })).toBeVisible();
    await expect(deals.getByRole("heading", { name: "Up to 30% Off" })).toBeVisible();
    await expect(deals.getByRole("heading", { name: "Up to 35% Off" })).toBeVisible();
  });

  test("sale grid is four equal fluid columns at desktop (P-9)", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "desktop-only pin");
    await page.goto("/");
    const grid = page.getByTestId("exclusive-deals").getByTestId("sale-grid");
    await expect(grid).toBeVisible();
    // Viewport-independent pin: 4 EQUAL columns (302px @1440, 282px @1280 —
    // the number moves with the viewport, the structure does not).
    const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" "));
    expect(cols).toHaveLength(4);
    expect(new Set(cols).size).toBe(1);
    const card = grid.locator("[data-product-card]").first();
    const box = await card.boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(Math.round(parseFloat(cols[0])));
  });

  test("product cards render the reference text stack (P-10)", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("product-row").first().locator("[data-product-card]").first();
    await expect(card).toBeVisible();
    const stack = await card.evaluate((el) => {
      // lucide tags each glyph with lucide-<name> — grab the STARS, not the
      // hover-row's shopping-bag icon.
      const star = el.querySelector("svg.lucide-star");
      const review = Array.from(el.querySelectorAll("span")).find((s) => /^\(\d+\)$/.test(s.textContent ?? ""));
      // The swatch chips carry title={color} — nothing else in the card does.
      const swatches = Array.from(el.querySelectorAll("span[title]"));
      const name = el.querySelector("h3");
      return {
        name: name ? name.textContent.trim() : null,
        starW: star ? Math.round(star.getBoundingClientRect().width) : 0,
        starColor: star ? getComputedStyle(star).color : null,
        reviewSize: review ? getComputedStyle(review).fontSize : null,
        swatchCount: swatches.length,
        saleChip: Array.from(el.querySelectorAll("span")).some((s) => /^-\d+%$/.test(s.textContent ?? "")),
        newChip: (el.textContent ?? "").includes("NEW"),
      };
    });
    expect(stack.name).toBeTruthy();
    expect(stack.starW).toBe(16);
    expect(stack.starColor).toBe("rgb(126, 113, 103)"); // muted-foreground stroke, not gold
    expect(stack.reviewSize).toBe("10px");
    expect(stack.swatchCount).toBe(3);
    // The first New Arrivals card is not on sale and isNew — reference shows
    // NO chip at all (neither "NEW" nor a discount).
    expect(stack.saleChip).toBe(false);
    expect(stack.newChip).toBe(false);
  });

  test("sale cards carry the -{discount}% chip and a strikethrough compare-at (P-10)", async ({ page }) => {
    await page.goto("/");
    const deals = page.getByTestId("exclusive-deals");
    const gown = deals.getByTestId("sale-grid").locator("[data-product-card]").first();
    await expect(gown).toBeVisible();
    const chip = gown.locator("span", { hasText: /^-\d+%$/ }).first();
    await expect(chip).toHaveText("-32%");
    // Tailwind v4 serializes its default palette in oklab (and this Chromium
    // keeps that serialization even through canvas) — assert the TOKEN
    // instead: probe elements carrying bg-red-500 / bg-red-600 serialize the
    // same way, so equality pins the exact color identity.
    const chipBg = await chip.evaluate((el) => {
      const probe = (cls: string) => {
        const n = document.createElement("span");
        n.className = cls;
        document.body.appendChild(n);
        const bg = getComputedStyle(n).backgroundColor;
        n.remove();
        return bg;
      };
      const actual = getComputedStyle(el).backgroundColor;
      return { is500: actual === probe("bg-red-500"), is600: actual === probe("bg-red-600") };
    });
    expect(chipBg.is500).toBe(true); // red-500 — not the old red-600 SALE word
    expect(chipBg.is600).toBe(false);
    const compareAt = gown.locator("span.line-through");
    await expect(compareAt).toBeVisible();
    await expect(compareAt).toHaveText("$4,200");
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
