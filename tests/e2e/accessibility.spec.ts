// Accessibility superset pins (session-11: A-1 + A-2 — the a11y roadmap
// items carried since session 8).
//
// A-1: skip-to-content — the FIRST chrome element is an sr-only link that
//      is revealed on keyboard focus and jumps focus to <main>. Parity-safe
//      by construction: at rest it is a 1×1 clipped box with zero layout
//      footprint; it only exists in the focus/hover layer the reference
//      never exercises.
//
// A-2: prefers-reduced-motion — a global media query tames the marquee's
//      30s infinite loop and every transition for users who opt out.
//      Normal-path rendering is untouched (resting parity unaffected).
import { expect, test } from "@playwright/test";

test.describe("accessibility superset", () => {
  test.describe("A-1 skip-to-content (logged-out chrome)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("A-1: skip-to-content is the first Tab stop, reveals on focus, jumps to main", async ({
      page,
    }) => {
      await page.goto("/");
      const skip = page.getByRole("link", { name: "Skip to content" });
      await expect(skip).toBeAttached();

      // At rest: sr-only — absolute, clipped to a 1×1 box (zero footprint).
      const rest = await skip.evaluate((el) => {
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return { position: cs.position, w: box.width, h: box.height };
      });
      expect(rest.position).toBe("absolute");
      expect(rest.w).toBe(1);
      expect(rest.h).toBe(1);

      // First Tab from the page top lands on the skip link.
      await page.keyboard.press("Tab");
      await expect(skip).toBeFocused();

      // Revealed on focus: a real, visible target (not the 1×1 clipped box).
      const revealed = await skip.evaluate((el) => {
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          position: cs.position,
          w: box.width,
          h: box.height,
          visibility: cs.visibility,
          overflow: cs.overflow,
        };
      });
      expect(revealed.position).toBe("static");
      expect(revealed.w).toBeGreaterThan(60);
      expect(revealed.h).toBeGreaterThan(20);
      expect(revealed.visibility).toBe("visible");
      expect(revealed.overflow).toBe("visible");

      // Enter follows the fragment: focus moves to <main id="main-content">.
      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
    });
  });

  test("A-2: prefers-reduced-motion tames the marquee loop; normal path keeps 30s", async ({
    page,
    browser,
  }) => {
    // Normal context (the fixture's): the marquee runs its 30s linear loop.
    await page.goto("/");
    const marquee = page.getByTestId("brand-marquee").locator(".animate-marquee");
    await expect(marquee).toBeAttached();
    const normalDur = await marquee.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(normalDur).toBe("30s");

    // Reduced-motion context: the global media query pins every animation
    // to 0.01ms × 1 iteration (and every transition to 0.01ms).
    const reduceCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const reducePage = await reduceCtx.newPage();
    await reducePage.goto("/");
    const reduceMarquee = reducePage.getByTestId("brand-marquee").locator(".animate-marquee");
    await expect(reduceMarquee).toBeAttached();
    const reducedDur = await reduceMarquee.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { dur: cs.animationDuration, iter: cs.animationIterationCount };
    });
    expect(reducedDur.dur).toBe("1e-05s"); // chromium serializes 0.01ms in seconds
    expect(parseFloat(reducedDur.dur)).toBeLessThan(0.001); // semantic: imperceptible
    expect(reducedDur.iter).toBe("1");
    await reduceCtx.close();
  });
});
