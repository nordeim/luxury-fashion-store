/**
 * Session-26 follow-up probe: the FULL ref-login JSON-LD shapes (esp. the
 * BreadcrumbList) + the clone-login preload hrefs (the 4th preload) + the
 * ref-login canonical/og surface for the record.
 */
const { chromium } = require("playwright");
const { spawn, execSync } = require("child_process");
const { assertPortFree, waitHealth } = require("./sweep-lib.cjs");

const PORT = 3200;
const REF = "https://pastel-aurelia-fashion-edit.base44.app/";
const CLONE = `http://127.0.0.1:${PORT}/`;

(async () => {
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
    const out = {};
    const rl = await (await browser.newContext()).newPage();
    await rl.goto(REF + "login", { waitUntil: "load", timeout: 45000 });
    out.refLogin = await rl.evaluate(`(function(){
      const lds = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch(e) { return { PARSE_FAIL: String(e).slice(0,60) }; } });
      const links = [...document.querySelectorAll('link[rel]')].map(l => l.rel + ' -> ' + (l.getAttribute('href')||'').slice(0,90) + (l.hasAttribute('crossorigin') ? ' [crossorigin]' : ''));
      return { lds, links };
    })()`);
    const cl = await (await browser.newContext()).newPage();
    await cl.goto(CLONE + "login", { waitUntil: "load", timeout: 45000 });
    out.cloneLogin = await cl.evaluate(`(function(){
      const preloads = [...document.querySelectorAll('link[rel="preload"]')].map(l => l.getAttribute('href') + ' as=' + l.getAttribute('as'));
      const canonical = document.querySelector('link[rel="canonical"]')?.href ?? null;
      const robots = document.querySelector('meta[name="robots"]')?.content ?? null;
      return { preloads, canonical, robots, title: document.title };
    })()`);
    // register page for the record (clone-only)
    const cr = await (await browser.newContext()).newPage();
    await cr.goto(CLONE + "register", { waitUntil: "load", timeout: 45000 });
    out.cloneRegister = await cr.evaluate(`(function(){
      return { title: document.title, lds: document.querySelectorAll('script[type="application/ld+json"]').length };
    })()`);
    await browser.close();
    console.log(JSON.stringify(out, null, 2));
  } finally {
    try { browser && (await browser.close()); } catch {}
    try {
      const pid = execSync(`ss -tlnp | grep ':${PORT} ' | grep -oP 'pid=\\K[0-9]+' | head -1`).toString().trim();
      if (pid) execSync(`kill ${pid}`);
    } catch {}
    try { server.kill(); } catch {}
  }
})().catch((e) => { console.error("PROBE FAIL:", e.message); process.exit(1); });
