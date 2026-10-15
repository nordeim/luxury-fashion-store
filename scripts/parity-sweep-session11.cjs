/**
 * Session-11 parity sweep — full session-9/10 ritual, both viewports, both sides.
 * Boots the production standalone on :3100 as a child process (killed at exit),
 * then measures clone + live reference with Playwright chromium.
 * Output: JSON to stdout (and /tmp/sweep-results.json).
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");

// F4 (session-13): one port constant — playwright.config.ts honors E2E_PORT,
// the sweep tool now follows it instead of hardcoding :3100 three times.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const REF = "https://pastel-aurelia-fashion-edit.base44.app/";
const CLONE = `http://127.0.0.1:${PORT}/`;

// M1 (session-12): probe the port BEFORE spawning. A leftover E2E webServer
// (or any process on :3100) used to make the spawned server die silently
// while waitHealth probed the OLD build — a confidently wrong census (the
// trap-#27 failure class). Fail fast with the fix spelled out instead.
function assertPortFree(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (e) => {
      if (e.code === "EADDRINUSE") {
        reject(new Error(
          `port ${port} is already in use — kill the stale process first ` +
          `(e.g. the E2E webServer or a previous sweep server), then re-run. ` +
          "Measuring against an unknown server would silently poison the census."
        ));
      } else reject(e);
    });
    probe.once("listening", () => probe.close(() => resolve()));
    probe.listen(port, "127.0.0.1");
  });
}

function waitHealth(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        res.on("end", retry);
      });
      // F3 (session-13): the 30s budget was only evaluated ACROSS retries —
      // a socket that connects but never responds left a request pending
      // forever and the sweep hung past its own timeout. Give each request
      // its own deadline; the destroy surfaces as an 'error' -> retry.
      req.setTimeout(2000, () => req.destroy(new Error("per-request health timeout")));
      req.on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error("server timeout"));
      setTimeout(tick, 500);
    };
    tick();
  });
}

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

// Drawer: click the header menu button (lg:hidden), measure panel + items.
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
  // size chips on the first New Arrivals card + sale-grid name font
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
  const fs = require("fs");
  const SHOTS = process.argv.includes("--shots");
  await assertPortFree(PORT);
  const server = spawn("node", [".next/standalone/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", DATABASE_URL: "file:" + process.cwd() + "/db/custom.db" },
    // M1: capture stderr so a boot failure prints the server's own error
    // instead of a bare health timeout; stdout stays drained.
    stdio: ["ignore", "ignore", "pipe"],
  });
  const serverErrTail = [];
  server.stderr.on("data", (d) => {
    serverErrTail.push(String(d));
    if (serverErrTail.length > 40) serverErrTail.shift();
  });
  // F2 (session-13): a spawn 'error' (ENOENT, EACCES, ...) must flow through
  // the main catch so `finally` still runs — process.exit(1) bypassed it and
  // skipped browser.close()/server.kill()/the results file.
  let spawnError = null;
  server.on("error", (e) => { spawnError = e; });
  // F1 (session-13): health-green does not mean OUR server answered. A child
  // that dies at boot (EADDRINUSE lost in the probe->spawn window, a crash)
  // used to leave waitHealth probing a FOREIGN process on :3100 — the same
  // confidently-wrong-census failure class M1 targets, through a narrower
  // door. Track the child's liveness; check it the moment health turns green.
  // NOTE: a bare flag check raced the exit-event DELIVERY — a fast foreign 200
  // (≈10ms) beat the dead child's exit event (≈50ms) and the guard passed
  // vacuously (caught first-hand in the session-13 RED->GREEN demo). The guard
  // therefore RACES the death-promise against a 300ms grace window: a child
  // dead at boot always delivers 'exit' inside it; a healthy child just pays
  // 300ms per sweep.
  let childDied = null;
  let signalChildDeath = () => {};
  const childDeath = new Promise((resolve) => { signalChildDeath = resolve; });
  server.on("exit", (code, signal) => { childDied = { code, signal }; signalChildDeath(); });
  const assertChildAlive = () => {
    if (childDied) {
      if (serverErrTail.length) {
        console.error("--- server stderr tail ---\n" + serverErrTail.join(""));
      }
      throw new Error(
        `standalone server exited during boot (code ${childDied.code}, signal ${childDied.signal}) — ` +
        "the health response came from a foreign process or the server crashed. " +
        "Kill the stale process on :" + PORT + " / fix the boot failure, then re-run."
      );
    }
    if (spawnError) {
      throw new Error("standalone server failed to spawn: " + spawnError.message);
    }
  };
  let browser;
  try {
    try {
      await waitHealth(CLONE + "api/health", 30000);
    } catch (e) {
      assertChildAlive(); // F1: a dead child is a sharper diagnosis than a timeout
      if (serverErrTail.length) {
        console.error("--- server stderr tail ---\n" + serverErrTail.join(""));
      }
      throw e;
    }
    // F1: the poison-window guard — give the exit event a 300ms delivery
    // window, then require the child to be alive. Green health + dead child
    // = the health response came from a foreign process.
    await Promise.race([childDeath, new Promise((r) => setTimeout(r, 300))]);
    assertChildAlive();
    browser = await chromium.launch();
    const errors = [];

    for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
      for (const [side, url] of [["ref", REF], ["clone", CLONE]]) {
        const ctx = await browser.newContext({ viewport });
        const page = await ctx.newPage();
        page.on("console", (m) => { if (m.type() === "error") errors.push(side + ":" + m.text().slice(0, 120)); });
        page.on("pageerror", (e) => errors.push(side + ":PAGEERROR:" + String(e).slice(0, 120)));
        try {
          await page.goto(url, { waitUntil: "load", timeout: 45000 });
        } catch (e) { results[`${name}-${side}`] = { navError: String(e).slice(0, 200) }; await ctx.close(); continue; }
        const c = await census(page);
        results[`${name}-${side}`] = c;
        if (name === "mobile") {
          c.drawer = await drawerCensus(page).catch((e) => ({ err: String(e).slice(0, 120) }));
        }
        c.pinned = await pinnedSurfaces(page).catch(() => ({}));
        if (SHOTS) {
          const dir = process.cwd() + "/docs/screenshots/";
          if (side === "clone") {
            if (name === "desktop") {
              await page.screenshot({ path: dir + "clone-home-desktop.png" });
              // deals section top (still on home — the deals h2 lives here)
              await page.evaluate(() => {
                const h2s = [...document.querySelectorAll("h2")];
                const deals = h2s.find((h) => /exclusive deals/i.test(h.textContent || ""));
                if (deals) {
                  const y = deals.closest("section")?.getBoundingClientRect().top ?? deals.getBoundingClientRect().top;
                  window.scrollTo(0, window.scrollY + y - 1);
                }
              });
              await page.waitForTimeout(400);
              await page.screenshot({ path: dir + "clone-exclusive-deals.png" });
              // I1 (session-12): capture a REAL size-chips close-up from the
              // PDP buy panel — the previous byte-copy of the home shot
              // documented nothing chip-specific.
              await page.goto(CLONE + "product/silk-draped-evening-gown", { waitUntil: "load" });
              const sizeBlock = page
                .locator("main div.mb-6")
                .filter({ has: page.getByRole("button", { name: "Size Guide" }) });
              await sizeBlock.waitFor({ state: "visible", timeout: 15000 });
              await sizeBlock.screenshot({ path: dir + "clone-size-chips.png" });
              await scrollAll(page);
              await page.evaluate(() => window.scrollTo(0, 0));
              await page.waitForTimeout(300);
              await page.screenshot({ path: dir + "clone-pdp.png" });
              await page.goto(CLONE + "shop", { waitUntil: "load" });
              await scrollAll(page);
              await page.evaluate(() => window.scrollTo(0, 0));
              await page.waitForTimeout(300);
              await page.screenshot({ path: dir + "clone-shop-plp.png" });
            } else {
              await page.screenshot({ path: dir + "clone-mobile-home.png" });
            }
          } else if (name === "desktop") {
            await page.screenshot({ path: dir + "ref-home-desktop.png" });
          }
        }
        await ctx.close();
      }
    }
    if (SHOTS) {
      // Drawer-open shots need interaction; do them separately.
      const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const mpage = await mctx.newPage();
      await mpage.goto(CLONE, { waitUntil: "load" });
      await mpage.locator("header button.lg\\:hidden").first().click();
      await mpage.waitForTimeout(400);
      await mpage.screenshot({ path: process.cwd() + "/docs/screenshots/clone-mobile-menu-open.png" });
      await mctx.close();

      const rctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const rpage = await rctx.newPage();
      await rpage.goto(REF, { waitUntil: "load", timeout: 45000 });
      await rpage.locator("header button.lg\\:hidden").first().click();
      await rpage.waitForTimeout(400);
      await rpage.screenshot({ path: process.cwd() + "/docs/screenshots/ref-mobile-menu-open.png" });
      await rctx.close();
    }
    results.consoleErrors = errors.slice(0, 20);
  } finally {
    // M1/F6: the single guarded close — a mid-census throw used to leak the
    // process until exit(); close() is idempotent, one call here suffices.
    if (browser) await browser.close().catch(() => {});
    server.kill("SIGKILL");
  }
  require("fs").writeFileSync("/tmp/sweep-results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error("SWEEP FAILED:", e); process.exit(1); });
