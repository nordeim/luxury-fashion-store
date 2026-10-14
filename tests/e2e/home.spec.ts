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

  test("product row cards are fixed-width at every breakpoint (P-4/P-13)", async ({ page }) => {
    await page.goto("/");
    const row = page.getByTestId("product-row").first();
    await expect(row).toBeVisible();
    const card = row.locator("[data-product-card]").first();
    const width = page.viewportSize()?.width ?? 0;
    // P-13 (session-8): the reference uses FIXED cards at ALL breakpoints —
    // 260px below lg (measured @390), 280px at lg+ — inside a gap-6 scroll
    // row (24px at every breakpoint; the old 2-up/3-up fractions + gap-4
    // were the drift).
    const expected = width >= 1024 ? 280 : 260;
    const box = await card.boundingBox();
    expect(box?.width).toBe(expected);
    const gap = await row.evaluate((el) => getComputedStyle(el).columnGap);
    expect(parseFloat(gap)).toBe(24);
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
    // placeholder is 08:24:00 — real hydration starts the tick. H-51
    // (session-8): ONE placeholder→client swap is not proof of ticking, so
    // require TWO successive client-value transitions — the interval keeps
    // firing while mounted (and keeps firing after H-49's re-arm).
    const readCd = () => countdown.evaluate((el) => el.textContent ?? "");
    const s0 = await readCd();
    await expect.poll(readCd, { timeout: 10_000 }).not.toBe(s0); // placeholder → live
    const s1 = await readCd();
    await expect.poll(readCd, { timeout: 10_000 }).not.toBe(s1); // still ticking
    const s2 = await readCd();
    expect(s2).toMatch(/\d{2}HRS:\d{2}MIN:\d{2}SEC/);
    const boxes = await countdown.evaluate((el) => {
      const parts = Array.from(el.querySelectorAll("div"));
      const ink = parts.filter((d) => getComputedStyle(d).backgroundColor === "rgb(23, 20, 17)");
      return { count: ink.length, w: ink.length ? Math.round(ink[0].getBoundingClientRect().width) : 0 };
    });
    expect(boxes.count).toBe(3);
    expect(boxes.w).toBe(48);
    // P-14 (session-8): the header text and the countdown share ONE row —
    // flex-col on mobile, flex-row at lg — with the countdown STACKED on the
    // right (label ABOVE the boxes, right-aligned at lg). The row is the
    // countdown's DIRECT parent (a div-has-both locator would match the
    // outer containers, whose default flexDirection is vacuously "row").
    const headerRow = deals.getByTestId("sale-countdown").locator("..");
    const rowDir = await headerRow.evaluate((el) => getComputedStyle(el).flexDirection);
    const vw = page.viewportSize()?.width ?? 0;
    expect(rowDir).toBe(vw >= 1024 ? "row" : "column");
    const stack = await countdown.evaluate((el) => {
      const label = Array.from(el.querySelectorAll("div,span")).find((n) => /SALE ENDS IN/i.test(n.textContent ?? ""));
      const boxesEl = Array.from(el.children).find((c) => c.querySelectorAll("div").length >= 3);
      if (!label || !boxesEl) return null;
      const lr = label.getBoundingClientRect();
      const br = boxesEl.getBoundingClientRect();
      return { labelAbove: lr.bottom <= br.top + 1, rightAligned: Math.abs(lr.right - br.right) < 3, leftAligned: Math.abs(lr.left - br.left) < 3 };
    });
    expect(stack).not.toBeNull();
    expect(stack!.labelAbove).toBe(true);
    if (vw >= 1024) expect(stack!.rightAligned).toBe(true);
    else expect(stack!.leftAligned).toBe(true);
    // Bento: the featured deal + two stacked — the tall tile's h3 is 36px at
    // desktop, the stacked ones 30px (both white on gradient).
    await expect(deals.getByRole("heading", { name: "Up to 40% Off" })).toBeVisible();
    await expect(deals.getByRole("heading", { name: "Up to 30% Off" })).toBeVisible();
    await expect(deals.getByRole("heading", { name: "Up to 35% Off" })).toBeVisible();
  });

  test("deals header is one merged row with the measured type scale (P-14)", async ({ page }) => {
    await page.goto("/");
    const deals = page.getByTestId("exclusive-deals");
    const kicker = deals.getByText("LIMITED TIME OFFER").first();
    await expect(kicker).toBeVisible();
    // The kicker sits 8px (mb-2) above the h2 — the old mb-3 12px was drift.
    const mb = await kicker.evaluate((el) => getComputedStyle(el).marginBottom);
    expect(parseFloat(mb)).toBe(8);
    // The countdown's row owns the header: mb-12 (48px) below the row — the
    // row IS the countdown's direct parent (single flex container).
    const headerRow = deals.getByTestId("sale-countdown").locator("..");
    const mb12 = await headerRow.evaluate((el) => getComputedStyle(el).marginBottom);
    expect(parseFloat(mb12)).toBe(48);
  });

  test("bento tiles keep the reference geometry (H-55 — aspect + stretch pin)", async ({ page }) => {
    await page.goto("/");
    const bento = page.getByTestId("exclusive-deals").locator(".grid.grid-cols-1.lg\\:grid-cols-2").first();
    await expect(bento).toBeVisible();
    const vw = page.viewportSize()?.width ?? 0;
    const geo = await bento.evaluate((el) => {
      const tall = el.children[0] as HTMLElement;
      const rightCol = el.children[1] as HTMLElement;
      const tiles = Array.from(rightCol.children) as HTMLElement[];
      const cs = (n: HTMLElement) => getComputedStyle(n);
      return {
        tallAspect: cs(tall).aspectRatio,
        tileAspects: tiles.map((t) => cs(t).aspectRatio),
        tallH: Math.round(tall.getBoundingClientRect().height),
        rightH: Math.round(rightCol.getBoundingClientRect().height),
        tileHs: tiles.map((t) => Math.round(t.getBoundingClientRect().height)),
      };
    });
    if (vw >= 1024) {
      // Desktop: the RIGHT tiles are 2:3 and the LEFT tile stretches to the
      // right column's combined height (measured 628×1908 over 942+942+24).
      expect(geo.tileAspects).toEqual(["2 / 3", "2 / 3"]);
      expect(Math.abs(geo.tallH - geo.rightH)).toBeLessThanOrEqual(2);
      const half = (geo.rightH - 24) / 2;
      expect(Math.abs(geo.tileHs[0] - half)).toBeLessThanOrEqual(2);
      expect(Math.abs(geo.tileHs[1] - half)).toBeLessThanOrEqual(2);
    } else {
      // Mobile: tall tile 4:3, stacked tiles 2:3 (re-measured 2026-10-15:
      // 342×513 — the reference's mobile tiles render the image's natural
      // 2:3 ratio; session-7's mobile 3:4 was the drift).
      expect(geo.tallAspect).toBe("4 / 3");
      expect(geo.tileAspects).toEqual(["2 / 3", "2 / 3"]);
    }
  });

  test("product cards render a size-chip row under the swatches (P-11)", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("product-row").first().locator("[data-product-card]").first();
    await expect(card).toBeVisible();
    const chips = await card.evaluate((el) => {
      // The size row is the flex-wrap row of bordered buttons AFTER the
      // swatch row (the swatches are span[title] chips; sizes are buttons).
      const buttons = Array.from(el.querySelectorAll(".flex-wrap button"));
      return buttons.map((b) => {
        const cs = getComputedStyle(b);
        return { label: b.textContent?.trim() ?? "", fs: cs.fontSize, padY: cs.paddingTop, border: cs.borderTopWidth, radius: cs.borderRadius, bg: cs.backgroundColor };
      });
    });
    // P-11: the reference renders ONE bordered chip per product size
    // ("One Size" for the bag) — 10px, py-1, 1px border, square.
    expect(chips.length).toBeGreaterThanOrEqual(1);
    for (const chip of chips) {
      expect(chip.fs).toBe("10px");
      expect(parseFloat(chip.padY)).toBe(4);
      expect(chip.border).toBe("1px");
      expect(parseFloat(chip.radius)).toBe(0);
    }
    // Superset: clicking a chip selects the size the card's Add to Bag posts
    // (selected state = border-foreground). Resting visuals have NO
    // selection — matching the reference's uniform muted chips.
    const first = card.locator(".flex-wrap button").first();
    const before = await first.evaluate((el) => getComputedStyle(el).borderTopColor);
    await first.click();
    await expect
      .poll(() => first.evaluate((el) => getComputedStyle(el).borderTopColor), { timeout: 5_000 })
      .not.toBe(before); // React re-render timing — poll, don't race
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
