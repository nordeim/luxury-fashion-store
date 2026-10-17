/**
 * Session-26 fresh-audit probe: compare the head surfaces the round-21a
 * census cannot see — the login page's JSON-LD/identity tags (the reference
 * ships THREE blocks there; the clone's (auth) group is chrome-less) and any
 * NEW home-head tags since the session-25 measurement.
 * Single invocation: boot standalone -> probe -> kill (the sandbox reaps
 * backgrounded process groups between tool calls).
 */
const { chromium } = require("playwright");
const { spawn, execSync } = require("child_process");
const { assertPortFree, waitHealth } = require("./sweep-lib.cjs");

const PORT = 3200; // probe port — away from the E2E :3100
const REF = "https://pastel-aurelia-fashion-edit.base44.app/";
const CLONE = `http://127.0.0.1:${PORT}/`;

(async () => {
  await assertPortFree(PORT);
  const server = spawn("node", [".next/standalone/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", DATABASE_URL: "file:" + process.cwd() + "/db/custom.db" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  const serverErr = [];
  server.stderr.on("data", (d) => serverErr.push(String(d)));
  let browser;
  try {
    await waitHealth(CLONE + "api/health", 30000);
    browser = await chromium.launch();
    const out = {};

    for (const [name, url] of [["ref-login", REF + "login"], ["clone-login", CLONE + "login"], ["ref-home", REF], ["clone-home", CLONE]]) {
      const page = await (await browser.newContext()).newPage();
      await page.goto(url, { waitUntil: "load", timeout: 45000 });
      out[name] = await page.evaluate(`(function(){
        const lds = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => {
          try { const j = JSON.parse(s.textContent); return j; } catch { return { PARSE_FAIL: (s.textContent||'').slice(0,80) }; }
        });
        const preloads = [...document.querySelectorAll('link[rel="preload"]')].map(l => l.getAttribute('href') + ' as=' + l.getAttribute('as') + ' cross=' + (l.hasAttribute('crossorigin') ? 'y' : 'n'));
        const themeColor = document.querySelector('meta[name="theme-color"]')?.content ?? null;
        const title = document.title;
        const ogType = document.querySelector('meta[property="og:type"]')?.content ?? null;
        return { title, lds, preloadCount: preloads.length, preloads: preloads.slice(0, 6), themeColor, ogType };
      })()`);
      if (name === "clone-home") out.cloneHomePreloads = out[name].preloads;
    }
    // PDP og surface (the carried item: og:type product?)
    const pdp = await (await browser.newContext()).newPage();
    await pdp.goto(CLONE + "product/silk-draped-evening-gown", { waitUntil: "load", timeout: 45000 });
    out.clonePdpOg = await pdp.evaluate(`(function(){
      const metas = {};
      for (const m of document.querySelectorAll('meta[property^="og:"], meta[property^="product:"], meta[name="twitter:card"]')) {
        metas[m.getAttribute('property') || m.getAttribute('name')] = m.content;
      }
      const lds = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent)['@type']; } catch { return 'PARSE_FAIL'; } });
      return { metas, ldTypes: lds };
    })()`);
    // reference PDP is 404 (no catalog) — the og:type product item is pure superset.
    await browser.close();
    console.log(JSON.stringify(out, null, 2));
  } finally {
    try { browser && (await browser.close()); } catch {}
    // kill by LISTENING pid (trap #36)
    try {
      const pid = execSync(`ss -tlnp | grep ':${PORT} ' | grep -oP 'pid=\\K[0-9]+' | head -1`).toString().trim();
      if (pid) execSync(`kill ${pid}`);
    } catch {}
    try { server.kill(); } catch {}
  }
})().catch((e) => { console.error("PROBE FAIL:", e.message); if (serverErr.length) console.error(serverErr.join("")); process.exit(1); });
