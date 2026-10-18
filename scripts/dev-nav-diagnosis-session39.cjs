#!/usr/bin/env node
// Session-39 harness diagnosis: why does the dev page keep navigating?
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const events = [];
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) events.push("NAV:" + f.url()); });
  page.on("console", (m) => events.push("console:" + m.type() + ":" + m.text().slice(0, 150)));
  page.on("pageerror", (e) => events.push("PAGEERROR:" + String(e).slice(0, 200)));
  page.on("request", (r) => { if (r.resourceType() === "document") events.push("REQ-DOC:" + r.url()); });

  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(8000); // watch 8s of behavior
  console.log("events captured (first 40):");
  for (const e of events.slice(0, 40)) console.log("  " + e);
  console.log("total document requests:", events.filter((e) => e.startsWith("REQ-DOC")).length);
  console.log("total navigations:", events.filter((e) => e.startsWith("NAV:")).length);
  await browser.close();
})().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
