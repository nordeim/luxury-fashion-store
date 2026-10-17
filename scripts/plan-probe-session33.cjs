#!/usr/bin/env node
// Session-33 plan-validation probe — wire-verifies the F-DD contract
// assumptions BEFORE the spec is written (the session-29…32 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3207
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB —
// the probe's login session + inserted OrderEvent land in the copy and die
// with it), signs james in through the real UI, then pins the account
// order-detail surface's wire behavior:
//   - the customer order view renders (order identity, item snapshots,
//     the Order Progress timeline with the seed's system events);
//   - a SQL-minted actor:"admin" event is HIDDEN from the served body
//     (the F-16 filter) while the system events stay visible;
//   - the owner gate 404s the canonical GUEST order ORD-2026-004
//     (userId: null) into the not-found card with no existence leak.
// Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const http = require("http");

const PORT = 3207;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session33-probe-secret-0123456789abcdef";
const ADMIN_NOTE = "INTERNAL AUDIT NOTE — MUST NEVER RENDER TO THE CUSTOMER";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe's writes never touch db/custom.db.
const PROBE_DB = `/tmp/probe-session33-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;

function req(path) {
  return new Promise((resolve, reject) => {
    const r = http.request(`${BASE}${path}`, { method: "GET" }, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () => resolve({ status: res.statusCode, body: out }));
    });
    r.on("error", reject);
    r.setTimeout(8000, () => r.destroy(new Error("timeout")));
    r.end();
  });
}

function waitHealth(deadlineMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      req("/api/health")
        .then((r) => (r.status === 200 ? resolve() : retry()))
        .catch(retry);
    };
    const retry = () => {
      if (Date.now() - start > deadlineMs) return reject(new Error("health timeout"));
      setTimeout(tick, 400);
    };
    tick();
  });
}

async function main() {
  const results = [];
  const check = (name, cond, detail) =>
    results.push({ name, ok: !!cond, detail: detail || "" });

  // Prisma on the COPY — id resolution + the admin-event fixture.
  const pdb = new PrismaClient({ datasources: { db: { url: PROBE_DB_URL } } });

  const orders = await pdb.order.findMany({
    where: { number: { in: ["ORD-2026-002", "ORD-2026-004"] } },
    select: { id: true, number: true, userId: true, items: { select: { nameSnapshot: true } } },
  });
  const own = orders.find((o) => o.number === "ORD-2026-002");
  const guest = orders.find((o) => o.number === "ORD-2026-004");
  check("canonical fixtures resolved on the copy", !!own && !!guest && guest.userId === null,
    own && guest ? `own=${own.id} guest.userId=${guest.userId}` : "missing");

  const browser = await chromium.launch();
  const ctx = await browser.newContext(); // fresh context ⇒ real james LOGIN (1 slot on the copy — free)
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // james signs in through the real UI (the auth spec's proven selectors).
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill("james@example.com");
  await page.getByLabel("Password").fill("Demo1234!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15_000 });
  check("james login lands on /account", /\/account$/.test(new URL(page.url()).pathname), page.url());

  const accountBody = await page.content();
  check("the orders list shows the customer order", accountBody.includes("ORD-2026-002"), "");
  check("the orders list hides the guest order (userId-filtered query)", !accountBody.includes("ORD-2026-004"), "");

  // The order-detail surface — the round's target.
  const detail = await page.goto(`${BASE}/account/orders/${own.id}`, { waitUntil: "domcontentloaded" });
  const body = await page.content();
  check("customer order detail serves 200 for its owner", detail.status() === 200, `got ${detail.status()}`);
  check("body carries the order number", body.includes("ORD-2026-002"), "");
  check("body carries the item snapshot", own.items.some((i) => body.includes(i.nameSnapshot)),
    own.items.map((i) => i.nameSnapshot).join("|"));
  check("body renders the Order Progress timeline", body.includes("Order Progress"), "");
  // The seed events carry NO explicit actor → model default "system" → visible.
  // The page renders e.type.replace("_", " ") — DOM text, lowercase (trap #38).
  check("system events visible: 'status changed'", /status changed/i.test(body), "");
  check("system events visible: 'tracking added'", /tracking added/i.test(body), "");

  // Mint an admin-authored event on the COPY (the shape adminUpdateOrderAction
  // writes — actor:"admin" + internal note), then re-measure the page.
  const ev = await pdb.orderEvent.create({
    data: { orderId: own.id, type: "status_changed", actor: "admin", note: ADMIN_NOTE },
  });
  const adminRows = await pdb.orderEvent.count({ where: { orderId: own.id, actor: "admin" } });
  check("admin-authored event minted on the copy", adminRows === 1, `count ${adminRows}`);

  await page.reload({ waitUntil: "domcontentloaded" });
  const body2 = await page.content();
  check("the F-16 filter hides the admin note from the customer body", !body2.includes(ADMIN_NOTE), "");
  check("system events stay visible after the insert", /status changed/i.test(body2), "");

  // Zero console errors on the detail surface.
  check("zero console errors on the detail page", consoleErrors.length === 0, consoleErrors.join(" || ").slice(0, 300));

  // The owner gate — james opens the canonical GUEST order's account URL.
  const idor = await page.goto(`${BASE}/account/orders/${guest.id}`, { waitUntil: "domcontentloaded" });
  const idorBody = await page.content();
  check("guest order's account URL 404s for james", idor.status() === 404, `got ${idor.status()}`);
  check("404 renders the not-found card", idorBody.includes("Page Not Found"), "");
  check("404 leaks no existence signal (the guest order number absent)", !idorBody.includes("ORD-2026-004"), "");

  await pdb.$disconnect();
  await ctx.close();
  await browser.close();

  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  ||  " + r.detail}`);
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

fs.copyFileSync(`${process.cwd()}/db/custom.db`, PROBE_DB);

const child = spawn("node", [".next/standalone/server.js"], {
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: "production",
    AUTH_SECRET: SECRET,
    DATABASE_URL: PROBE_DB_URL,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderrTail = "";
child.stderr.on("data", (c) => (stderrTail = (stderrTail + c).slice(-2000)));

waitHealth(20000)
  .then(main)
  .catch((e) => {
    console.error("probe error:", e.message, stderrTail);
    process.exitCode = 1;
  })
  .finally(() => {
    child.kill("SIGTERM");
    try { fs.unlinkSync(PROBE_DB); } catch {}
  });
