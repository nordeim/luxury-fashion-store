#!/usr/bin/env node
// Session-55 plan-validation probe — wire-verifies the F-ZZ contract
// assumptions BEFORE the spec is written (the standing §4 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209
// against db/custom.db (the homepage navigation chrome is a PURE-READ
// surface — zero DB writes, zero cookie mints, zero limiter consumption;
// the E2E webServer itself is left alone on :3100) and drives the real UI
// in Playwright Chromium.
//
// Checks (all on the wire, in the real DOM):
//   1. the hero counter reads "01 / 03" at rest (the live-counter contract);
//   2. Previous from slide 1 WRAPS to slide 3 (the negative-modulo arm) —
//      counter "03 / 03" — and a second Previous lands slide 2;
//   3. "Go to slide 3" jumps there (counter follows) and "Go to slide 2"
//      likewise;
//   4. three Next clicks from slide 1 wrap back to slide 1 (the positive
//      arm — pins against a clamp-shaped regression);
//   5. the active slide's CTA click lands /shop with the product grid;
//   6. the New Arrivals row's forward arrow advances scrollLeft ~2 cards +
//      gaps and the back arrow returns it to 0;
//   7. hovering the desktop Women nav button opens the mega menu and its
//      "Dresses" link lands /shop?category=women&search=Dresses narrowed;
//   8. the header Sale link lands /shop?sale=1;
//   9. the first Edit card lands /shop?category=women with the grid;
//  10. zero console errors across the whole ladder.
// Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("node:path");
const { chromium } = require("playwright");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");

let passCount = 0;
let failCount = 0;
function results(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (ok) passCount++;
  else { failCount++; process.exitCode = 1; }
}

async function waitHealth(deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) {
        const body = await res.json();
        if (body.ok === true) return body;
      }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

(async () => {
  if (!fs.existsSync(STANDALONE)) {
    console.error("standalone missing — run `npm run build` first");
    process.exit(1);
  }

  const child = spawn("node", [STANDALONE], {
    cwd: REPO,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      DATABASE_URL: `file:${path.join(REPO, "db", "custom.db")}`,
      AUTH_SECRET: "session55-probe-secret-0123456789abcdef",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderrTail = "";
  child.stderr.on("data", (d) => { stderrTail = (stderrTail + d.toString()).slice(-2000); });

  let browser;
  try {
    const health = await waitHealth(25000);
    results("1. standalone boots + health ok", !!health, health ? JSON.stringify(health) : "no health");
    if (!health) throw new Error("server never became healthy");

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const consoleErrors = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    const carousel = () => page.getByTestId("hero-carousel");
    const activeIdx = async () =>
      carousel().evaluate((el) => {
        const slides = [...el.querySelectorAll("[data-testid^='hero-slide-']")];
        const active = slides.find((s) => s.getAttribute("data-active") === "true");
        return active ? slides.indexOf(active) : -1;
      });
    const counterText = () => carousel().evaluate((el) => {
      const counter = el.querySelector("div.absolute.bottom-8.right-10");
      return counter ? counter.textContent.trim() : "(none)";
    });

    await page.goto(`${BASE}/`, { waitUntil: "load" });

    // 1. counter at rest
    const restCounter = await counterText();
    results("2. counter reads 01 / 03 at rest", restCounter === "01 / 03", `got: ${restCounter}`);

    // 2. Previous wraps slide 1 -> slide 3 (negative-modulo arm), then slide 2
    await page.getByRole("button", { name: "Previous slide" }).click();
    await page.waitForTimeout(250);
    const afterPrev1 = await activeIdx();
    const counterPrev1 = await counterText();
    results("3. Previous from slide 1 wraps to slide 3 (idx 2)", afterPrev1 === 2, `idx: ${afterPrev1}, counter: ${counterPrev1}`);
    results("4. counter tracks the wrap (03 / 03)", counterPrev1 === "03 / 03", `got: ${counterPrev1}`);
    await page.getByRole("button", { name: "Previous slide" }).click();
    await page.waitForTimeout(250);
    const afterPrev2 = await activeIdx();
    const counterPrev2 = await counterText();
    results("5. second Previous steps back to slide 2 (idx 1)", afterPrev2 === 1, `idx: ${afterPrev2}, counter: ${counterPrev2}`);

    // 3. dots jump
    await page.getByRole("button", { name: "Go to slide 3" }).click();
    await page.waitForTimeout(250);
    const afterDot3 = await activeIdx();
    const counterDot3 = await counterText();
    results("6. dot 'Go to slide 3' jumps (idx 2)", afterDot3 === 2, `idx: ${afterDot3}, counter: ${counterDot3}`);
    await page.getByRole("button", { name: "Go to slide 2" }).click();
    await page.waitForTimeout(250);
    const afterDot2 = await activeIdx();
    results("7. dot 'Go to slide 2' jumps (idx 1)", afterDot2 === 1, `idx: ${afterDot2}`);

    // 4. Next wraps slide 3 -> slide 1 (positive arm) — from slide 2: 3 clicks wrap
    const nextBtn = page.getByRole("button", { name: "Next slide" });
    await nextBtn.click(); await page.waitForTimeout(150); // slide 3
    await nextBtn.click(); await page.waitForTimeout(150); // wrap -> slide 1
    await nextBtn.click(); await page.waitForTimeout(150); // slide 2
    const afterNexts = await activeIdx();
    const counterNexts = await counterText();
    results("8. three Next clicks from slide 2 wrap through to slide 2 (idx 1)", afterNexts === 1, `idx: ${afterNexts}, counter: ${counterNexts}`);
    // A cleaner wrap proof: reset to slide 1 via dot, then 3 Next -> back to slide 1
    await page.getByRole("button", { name: "Go to slide 1" }).click();
    await page.waitForTimeout(200);
    await nextBtn.click(); await page.waitForTimeout(150);
    await nextBtn.click(); await page.waitForTimeout(150);
    await nextBtn.click(); await page.waitForTimeout(250);
    const wrapIdx = await activeIdx();
    const wrapCounter = await counterText();
    results("9. Next wraps from the LAST slide back to the FIRST (idx 0, 01 / 03)", wrapIdx === 0 && wrapCounter === "01 / 03", `idx: ${wrapIdx}, counter: ${wrapCounter}`);

    // 5. the active slide's CTA lands /shop
    const cta = carousel().locator('div[data-active="true"]').getByRole("link");
    await cta.click();
    await page.waitForURL(`${BASE}/shop`, { timeout: 8000 }).catch(() => {});
    const ctaLanded = page.url().endsWith("/shop");
    const gridVisible = await page.getByTestId("product-grid").isVisible().catch(() => false);
    results("10. the active hero CTA lands /shop + grid visible", ctaLanded && gridVisible, `url: ${page.url()}`);

    // 6. row scroller arrows (the product-row testid sits ON the scroller
    //    itself — home.spec.ts:443's own comment)
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    const scroller = page.getByTestId("product-row").first();
    await scroller.scrollIntoViewIfNeeded();
    const before = await scroller.evaluate((el) => Math.round(el.scrollLeft));
    await page.getByRole("button", { name: "Scroll New Arrivals forward" }).click();
    await page.waitForTimeout(900); // smooth scroll settle
    const forward = await scroller.evaluate((el) => Math.round(el.scrollLeft));
    results("11. forward arrow advances the row (scrollLeft > 100)", forward > 100, `0 -> ${forward}px`);
    await page.getByRole("button", { name: "Scroll New Arrivals back" }).click();
    await page.waitForTimeout(900);
    const back = await scroller.evaluate((el) => Math.round(el.scrollLeft));
    results("12. back arrow returns the row (scrollLeft back near 0)", back < Math.max(40, forward / 4), `${forward}px -> ${back}px`);

    // 7. mega menu: hover Women -> Dresses link
    const womenNav = page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /Women/ });
    await womenNav.hover();
    await page.waitForTimeout(350); // group-hover transition
    const dresses = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dresses" });
    const dressesVisible = await dresses.isVisible().catch(() => false);
    results("13. mega menu opens on hover (Dresses link visible)", dressesVisible);
    if (dressesVisible) {
      await dresses.click();
      await page.waitForURL(/category=women&search=Dresses/, { timeout: 8000 }).catch(() => {});
      const megaUrl = decodeURIComponent(page.url());
      const megaCount = await page.getByTestId("result-count").textContent().catch(() => "");
      const megaN = Number((megaCount ?? "").match(/\d+/)?.[0] ?? -1);
      results("14. Dresses link lands the dual-param PLP narrowed", /category=women&search=Dresses/.test(megaUrl) && megaN > 0 && megaN < 12, `url: ${megaUrl}, count: ${megaN}`);
    }

    // 8. header Sale link
    const saleLink = page.getByRole("navigation", { name: "Secondary" }).getByRole("link", { name: "Sale" });
    const saleVisible = await saleLink.isVisible().catch(() => false);
    if (saleVisible) {
      await saleLink.click();
      await page.waitForURL(/sale=1/, { timeout: 8000 }).catch(() => {});
      const struckVisible = await page.getByTestId("product-grid").locator(".line-through").first().isVisible().catch(() => false);
      results("15. header Sale link lands /shop?sale=1 + struck-through price", /sale=1/.test(page.url()) && struckVisible, `url: ${page.url()}`);
    } else {
      results("15. header Sale link lands /shop?sale=1 + struck-through price", false, "Sale link not visible at 1280px");
    }

    // 9. the first Edit card
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    const editCard = page.getByTestId("the-edit").locator("a").first();
    await editCard.scrollIntoViewIfNeeded();
    await editCard.click();
    await page.waitForURL(/category=women/, { timeout: 8000 }).catch(() => {});
    const editGrid = await page.getByTestId("product-grid").isVisible().catch(() => false);
    results("16. the first Edit card lands /shop?category=women + grid", /category=women/.test(page.url()) && editGrid, `url: ${page.url()}`);

    // 10. console errors
    results("17. zero console errors across the ladder", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | ").slice(0, 300));
  } catch (err) {
    console.error("PROBE ERROR:", err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 300));
    child.kill("SIGKILL");
  }

  console.log(`\nprobe: ${passCount} passed, ${failCount} failed`);
  if (stderrTail.trim()) console.log(`--- server stderr tail ---\n${stderrTail.trim().slice(-400)}`);
})();
