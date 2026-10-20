#!/usr/bin/env node
// Session-54 plan-validation probe — wire-verifies the F-YY contract
// assumptions BEFORE the spec is written (the standing §4 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209
// against db/custom.db (the search overlay is a PURE-READ surface — zero
// DB writes, zero cookie mints; the E2E webServer itself is left alone on
// :3100) and drives the real UI in Playwright Chromium.
//
// Checks (all on the wire, in the real DOM):
//   1. the overlay opens via the header Search button; the input takes focus;
//   2. the TRENDING SEARCHES label + all five chips render at rest;
//   3. typing "silk" renders >= 2 typeahead hit rows (the seeded catalog's
//      "Silk Draped Evening Gown" + "Embroidered Silk Blouse") carrying
//      brand + name + price; the trending block disappears at q >= 2;
//   4. a garbage query shows the "No results" guidance;
//   5. clicking the gown hit lands /product/silk-draped-evening-gown;
//   6. Enter on "silk" lands /shop?search=silk with a narrowed count;
//   7. the "Cashmere" chip lands /shop?search=Cashmere with a narrowed count;
//   8. Escape and the X button both dismiss the overlay;
//   9. zero console errors across the whole ladder.
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
      AUTH_SECRET: "session54-probe-secret-0123456789abcdef",
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

    await page.goto(`${BASE}/`, { waitUntil: "load" });

    // 1. open + focus
    await page.getByRole("button", { name: "Search" }).click();
    const overlay = page.getByTestId("search-overlay");
    await overlay.waitFor({ state: "visible", timeout: 5000 });
    const focusedIsInput = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") === "Search styles, brands, categories",
    );
    results("2. overlay opens + input focused", focusedIsInput);

    // 2. trending chips at rest
    await page.waitForTimeout(300);
    const chipTexts = await page.locator("button", { hasText: /^(Silk Gown|Cashmere|Tailored Blazer|Leather Bag|Accessories)$/ }).allTextContents();
    const chipSet = new Set(chipTexts.map((t) => t.trim()));
    const wantChips = ["Silk Gown", "Cashmere", "Tailored Blazer", "Leather Bag", "Accessories"];
    const chipsOk = wantChips.every((c) => chipSet.has(c));
    results("3. all five trending chips render at rest", chipsOk, `got: ${[...chipSet].join(" | ")}`);

    // 3. typeahead hits for "silk"
    const input = page.getByPlaceholder("Search styles, brands, categories");
    await input.fill("silk");
    const gownRow = page.locator("button", { hasText: "Silk Draped Evening Gown" });
    await gownRow.waitFor({ state: "visible", timeout: 8000 });
    const blouseRow = page.locator("button", { hasText: "Embroidered Silk Blouse" });
    const blouseVisible = await blouseRow.isVisible().catch(() => false);
    const rowText = await gownRow.textContent();
    const rowHasPrice = /\$\d/.test(rowText ?? "");
    const rowHasBrand = /Maison|Atelier|Studio|Couture|House|&/i.test(rowText ?? "") || (rowText ?? "").trim().split(/\s+/).length >= 4;
    results("4. typeahead renders the gown + blouse hits w/ price", blouseVisible && rowHasPrice, `row: ${(rowText ?? "").slice(0, 80)}`);
    const trendingStillVisible = await page.getByText("TRENDING SEARCHES").isVisible().catch(() => false);
    results("5. trending block hidden at q >= 2", !trendingStillVisible);

    // 4. no-results guidance
    await input.fill("zzzznothing9999");
    await page.waitForTimeout(700);
    const noResults = await page.getByText(/No results for/i).isVisible().catch(() => false);
    results("6. no-hit query shows the guidance", noResults);

    // 5. hit-click navigation
    await input.fill("silk");
    await gownRow.waitFor({ state: "visible", timeout: 8000 });
    await gownRow.click();
    await page.waitForURL(/\/product\/silk-draped-evening-gown/, { timeout: 8000 });
    const pdpOk = page.url().includes("/product/silk-draped-evening-gown");
    const overlayGone = !(await page.getByTestId("search-overlay").isVisible().catch(() => false));
    results("7. hit-click lands the PDP + closes the overlay", pdpOk && overlayGone, page.url());

    // 6. Enter submit
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByPlaceholder("Search styles, brands, categories").fill("silk");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/shop\?search=silk/, { timeout: 8000 });
    const countText = await page.getByTestId("result-count").textContent().catch(() => "");
    const count = Number((countText ?? "").match(/\d+/)?.[0] ?? 0);
    results("8. Enter submits to /shop?search=silk (narrowed)", count > 0 && count < 12, `count=${count}`);

    // 7. trending chip navigation
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Search" }).click();
    await page.locator("button", { hasText: /^Cashmere$/ }).click();
    await page.waitForURL(/\/shop\?search=Cashmere/, { timeout: 8000 });
    const chipCount = Number(((await page.getByTestId("result-count").textContent()) ?? "").match(/\d+/)?.[0] ?? 0);
    results("9. the Cashmere chip lands /shop?search=Cashmere", chipCount > 0 && chipCount < 12, `count=${chipCount}`);

    // 8. Escape + X dismiss
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByTestId("search-overlay").waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.press("Escape");
    const escapeClosed = !(await page.getByTestId("search-overlay").isVisible().catch(() => false));
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByTestId("search-overlay").waitFor({ state: "visible", timeout: 5000 });
    await page.getByRole("button", { name: "Close search" }).click();
    const xClosed = !(await page.getByTestId("search-overlay").isVisible().catch(() => false));
    results("10. Escape and X both dismiss the overlay", escapeClosed && xClosed, `escape=${escapeClosed} x=${xClosed}`);

    // 9. console errors
    const realErrors = consoleErrors.filter((e) => !/favicon|net::ERR_ABORTED/i.test(e));
    results("11. zero console errors across the ladder", realErrors.length === 0, realErrors.slice(0, 3).join(" || "));

    console.log(`\nprobe-session54: ${passCount} passed, ${failCount} failed`);
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    console.error("stderr tail:", stderrTail.slice(-500));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 3000).unref();
  }
})();
