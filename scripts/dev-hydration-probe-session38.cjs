#!/usr/bin/env node
// Session-38 harness check: does the clone's mobile drawer open on the DEV
// server (:3000) through a REAL Playwright click? (The E2E gate proves it on
// the standalone; the sweep census proves it on the standalone; agent-browser's
// CDP click on :3000 appears inert — this probe isolates dev-server hydration
// from agent-browser's click mechanism.)
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(2000);
  const burger = page.locator("header button[aria-label='Open menu']");
  console.log("burger visible:", await burger.isVisible());
  await burger.click();
  await page.waitForTimeout(600);
  const dialog = page.locator('div[role="dialog"]');
  console.log("dialog count after click:", await dialog.count());
  console.log("body overflow:", JSON.stringify(await page.evaluate(() => document.body.style.overflow)));
  // Click the Women link → must navigate to /shop?category=women and close.
  const women = page.getByRole("link", { name: "Women", exact: true }).first();
  if ((await dialog.count()) > 0) {
    await women.click();
    await page.waitForTimeout(800);
    console.log("url after Women click:", page.url());
    console.log("dialog count after nav:", await page.locator("div[role=dialog]").count());
    console.log("body overflow after nav:", JSON.stringify(await page.evaluate(() => document.body.style.overflow)));
  }
  console.log("console/page errors:", errors.length ? errors.slice(0, 3) : "none");
  await browser.close();
})().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
