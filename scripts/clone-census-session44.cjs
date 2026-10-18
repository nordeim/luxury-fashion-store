#!/usr/bin/env node
// Session-44 clone-side census — the round-39a sweep's CLONE half, run
// one-off because the LIVE reference is down (Base44 503, probed 4× over
// ~2 minutes at census time — the two-sided ledger requires BOTH sides, so
// the reference-side fields are carried by documentation from the round-38
// live measurement; this script re-verifies the clone held still). The
// census/drawer/pinned functions are copied VERBATIM from
// scripts/parity-sweep-session11.cjs so the output stays byte-comparable
// with the standing ledger. Also takes the sweep's 7 clone screenshots
// (the 2 ref shots need the reference up).
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const { assertPortFree, waitHealth } = require("./sweep-lib.cjs");

const PORT = Number(process.env.E2E_PORT ?? 3100);
const CLONE = `http://127.0.0.1:${PORT}/`;

async function scrollAll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = () => {
        y += 700;
        window.scrollTo(0, y);
        if (y < document.body.scrollHeight) setTimeout(step, 90);
        else { window.scrollTo(0, 0); setTimeout(resolve, 350); }
      };
      step();
    });
  });
  await page.waitForLoadState("networkidle").catch(() => {});
}

const CENSUS = `(function(){
  const main = document.querySelector('main');
  const secs = [...main.children].map(c => Math.round(c.getBoundingClientRect().height));
  const footer = document.querySelector('footer');
  const fH = footer ? Math.round(footer.getBoundingClientRect().height) : -1;
  const ranks = {};
  for (const h of document.querySelectorAll('h1,h2,h3,h4')) {
    const r = h.tagName.toLowerCase();
    const ff = getComputedStyle(h).fontFamily.split(',')[0].replace(/["']/g,'').trim();
    ranks[r] = ranks[r] || {};
    ranks[r][ff] = (ranks[r][ff]||0)+1;
  }
  return JSON.stringify({ pageH: document.body.scrollHeight, mainKids: main.children.length, secs, footerH: fH, ranks });
})()`;

async function census(page) {
  await scrollAll(page);
  return JSON.parse(await page.evaluate(CENSUS));
}

async function drawerCensus(page) {
  const btn = page.locator("header button.lg\\:hidden").first();
  await btn.click();
  await page.waitForTimeout(400);
  const data = await page.evaluate(`(function(){
    const panel = document.querySelector('div.fixed.left-0.top-0');
    if (!panel) return JSON.stringify({ panel: null });
    const cls = panel.className;
    const nav = panel.querySelector('nav');
    const navCls = nav ? nav.className : null;
    const items = nav ? [...nav.children].map(el => {
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    }) : [];
    const gaps = [];
    for (let i = 1; i < items.length; i++) gaps.push(items[i].y - (items[i-1].y + items[i-1].h));
    return JSON.stringify({ panelCls: cls, navCls, items, gaps });
  })()`);
  await page.keyboard.press("Escape").catch(() => {});
  const closeBtn = page.locator('div.fixed.left-0.top-0 button').first();
  if (await closeBtn.count()) await closeBtn.click().catch(() => {});
  await page.waitForTimeout(250);
  return JSON.parse(data);
}

async function pinnedSurfaces(page) {
  return JSON.parse(await page.evaluate(`(function(){
    const out = {};
    const chip = document.querySelector('.flex-wrap button');
    if (chip) {
      const s = getComputedStyle(chip);
      out.chip = { fs: s.fontSize, px: s.paddingLeft + '/' + s.paddingRight, py: s.paddingTop, radius: s.borderRadius, bg: s.backgroundColor, border: s.borderColor };
    }
    const h3 = document.querySelector('h3');
    if (h3) out.nameH3 = { ff: getComputedStyle(h3).fontFamily.split(',')[0], fs: getComputedStyle(h3).fontSize };
    const marquee = document.querySelector('div[class*="animate"]');
    out.hasMarquee = !!marquee;
    return JSON.stringify(out);
  })()`));
}

(async () => {
  const results = {};
  await assertPortFree(PORT);
  const server = spawn("node", [".next/standalone/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", DATABASE_URL: "file:" + process.cwd() + "/db/custom.db" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let browser;
  try {
    await waitHealth(CLONE + "api/health", 30000);
    browser = await chromium.launch();
    const errors = [];

    for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      page.on("console", (m) => { if (m.type() === "error") errors.push(name + ":" + m.text().slice(0, 120)); });
      page.on("pageerror", (e) => errors.push(name + ":PAGEERROR:" + String(e).slice(0, 120)));
      await page.goto(CLONE, { waitUntil: "load", timeout: 45000 });
      const c = await census(page);
      results[`${name}-clone`] = c;
      if (name === "mobile") {
        c.drawer = await drawerCensus(page).catch((e) => ({ err: String(e).slice(0, 120) }));
      }
      c.pinned = await pinnedSurfaces(page).catch(() => ({}));
      if (name === "desktop") {
        await page.screenshot({ path: "docs/screenshots/clone-home-desktop.png" });
        await page.evaluate(() => {
          const h2s = [...document.querySelectorAll("h2")];
          const deals = h2s.find((h) => /exclusive deals/i.test(h.textContent || ""));
          if (deals) {
            const y = deals.closest("section")?.getBoundingClientRect().top ?? deals.getBoundingClientRect().top;
            window.scrollTo(0, window.scrollY + y - 1);
          }
        });
        await page.waitForTimeout(400);
        await page.screenshot({ path: "docs/screenshots/clone-exclusive-deals.png" });
        await page.goto(CLONE + "product/silk-draped-evening-gown", { waitUntil: "load" });
        const sizeBlock = page
          .locator("main div.mb-6")
          .filter({ has: page.getByRole("button", { name: "Size Guide" }) });
        await sizeBlock.waitFor({ state: "visible", timeout: 15000 });
        await sizeBlock.screenshot({ path: "docs/screenshots/clone-size-chips.png" });
        await scrollAll(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
        await page.screenshot({ path: "docs/screenshots/clone-pdp.png" });
        await page.goto(CLONE + "shop", { waitUntil: "load" });
        await scrollAll(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
        await page.screenshot({ path: "docs/screenshots/clone-shop-plp.png" });
      } else {
        await page.screenshot({ path: "docs/screenshots/clone-mobile-home.png" });
      }
      await ctx.close();
    }

    // Drawer-open shot (the sweep's separate mobile block).
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mpage = await mctx.newPage();
    await mpage.goto(CLONE, { waitUntil: "load" });
    await mpage.locator("header button.lg\\:hidden").first().click();
    await mpage.waitForTimeout(400);
    await mpage.screenshot({ path: "docs/screenshots/clone-mobile-menu-open.png" });
    await mctx.close();

    results.consoleErrors = errors.slice(0, 20);
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill("SIGKILL");
  }
  require("fs").writeFileSync("/tmp/clone-census-session44.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error("CLONE CENSUS FAILED:", e); process.exit(1); });
