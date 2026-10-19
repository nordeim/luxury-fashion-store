#!/usr/bin/env node
// Session-47 focused mobile-nav settle probe: the session-38 probe's fixed
// 800ms post-click wait may race the dev-server soft navigation in this
// (slower) sandbox. This variant waits for the URL change explicitly
// (10s bound) — settling whether the Women link's navigation LANDS at all
// on the dev server (the production standalone's navigation is already
// pinned green by tests/e2e/mobile-navigation.spec.ts).
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 45000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  const burger = page.locator("header button[aria-label='Open menu']");
  console.log("burger visible:", await burger.isVisible());
  await burger.click();
  await page.waitForTimeout(600);
  console.log("dialog count after click:", await page.locator("div[role=\"dialog\"]").count());
  console.log("body overflow:", JSON.stringify(await page.evaluate(() => document.body.style.overflow)));
  const women = page.getByRole("link", { name: "Women", exact: true }).first();
  await women.click();
  // The settle: wait for the soft navigation explicitly (bounded 10s).
  let landed = true;
  try {
    await page.waitForURL("**/shop?category=women", { timeout: 10_000 });
  } catch {
    landed = false;
  }
  console.log("url after Women click:", page.url());
  console.log("navigation landed:", landed);
  console.log("dialog count after nav:", await page.locator("div[role=\"dialog\"]").count());
  console.log("body overflow after nav:", JSON.stringify(await page.evaluate(() => document.body.style.overflow)));
  if (landed) {
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    console.log("shop h1:", JSON.stringify(h1));
    console.log("product cards:", await page.locator("a[href^=\"/product/\"]").count());
  }
  console.log("console/page errors:", errors.length ? errors.slice(0, 5) : "none");
  await browser.close();
})().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
