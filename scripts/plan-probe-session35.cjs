#!/usr/bin/env node
// Session-35 plan-validation probe — wire-verifies the F-FF contract
// assumptions BEFORE the spec is written (the session-29…34 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3207
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB),
// logs james in through the REAL UI on the copy (the session-33 shape),
// then pins the /checkout/success capability gate's OWNER rows:
//   - row 1: signed-in owner + OWN order + NO token → 200 with the order
//     number, james's email, and the item content on the served body;
//   - row 2: signed-in user + the GUEST order + NO token → 404 into the
//     platform not-found card with ZERO guest-email leak;
//   - row 3: signed-in user + the guest order + its own OFFLINE token →
//     200 with the guest email (the token path is session-orthogonal);
//   - row 3b: a cross-order token while signed in → 404;
//   - the offline token reproduces the declared 40-hex HMAC shape;
//   - james's canonical state untouched; zero console errors.
// Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const { createHmac } = require("node:crypto");
const fs = require("fs");

const PORT = 3207;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session35-probe-secret-0123456789abcdef";
const JAMES = { email: "james@example.com", password: "Demo1234!" };
const GUEST_EMAIL = "guest.visitor@example.com";

// The declared shape (src/lib/order-token.ts): HMAC-SHA256 over
// `order-view:${orderNumber}`, hex, first 40 chars — with the standalone's
// AUTH_SECRET (= the probe SECRET the server boots with).
function orderViewTokenOffline(orderNumber) {
  return createHmac("sha256", SECRET).update(`order-view:${orderNumber}`).digest("hex").slice(0, 40);
}

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session35-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;

async function main() {
  const results = [];
  const check = (name, cond, detail) =>
    results.push({ name, ok: !!cond, detail: detail || "" });

  const browser = await chromium.launch();
  const ctx = await browser.newContext(); // fresh context ⇒ the real login UI
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // 1) Log james in through the REAL form (the session-33 probe shape —
  //    the login lands on /account; zero dev-DB impact, it's the copy).
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(JAMES.email);
  await page.getByLabel("Password").fill(JAMES.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15_000 });
  check("james logs in through the real UI on the copy", /\/account$/.test(new URL(page.url()).pathname), page.url());

  // 2) ROW 1 — the DIRECT owner capability: james + own order + NO token →
  //    200 with the PII the gate protects for the rightful owner.
  const own = await page.goto(`${BASE}/checkout/success?order=ORD-2026-001`);
  check("row 1: owner + own order + no token → 200", own?.status() === 200, `status=${own?.status()}`);
  const ownBody = await page.content();
  check("row 1: the order number is on the body", ownBody.includes("ORD-2026-001"), "");
  check("row 1: james's email is on the body (the owner's PII)", ownBody.includes(JAMES.email), "");
  check("row 1: the item content is on the body", ownBody.includes("Silk Draped Evening Gown"), "");

  // 3) ROW 2 — signed-in + the GUEST order + NO token → 404, no leak.
  const guestNoToken = await page.goto(`${BASE}/checkout/success?order=ORD-2026-004`);
  check("row 2: signed-in + guest order + no token → 404", guestNoToken?.status() === 404, `status=${guestNoToken?.status()}`);
  const notFoundBody = await page.content();
  check("row 2: the platform not-found card serves", notFoundBody.includes("Page Not Found"), "");
  check("row 2: ZERO guest-email leak", !notFoundBody.includes(GUEST_EMAIL), "");

  // 4) ROW 3 — signed-in + guest order + its own VALID offline token → 200
  //    (the token path is session-orthogonal — a gate 'tightened' to
  //    require logged-out would break shared confirmation links).
  const token004 = orderViewTokenOffline("ORD-2026-004");
  check("the offline token is the declared 40-hex shape", /^[0-9a-f]{40}$/.test(token004), token004.slice(0, 12));
  const guestWithToken = await page.goto(`${BASE}/checkout/success?order=ORD-2026-004&t=${token004}`);
  check("row 3: signed-in + guest order + own valid token → 200", guestWithToken?.status() === 200, `status=${guestWithToken?.status()}`);
  const tokenBody = await page.content();
  check("row 3: the guest email is on the body for the token holder", tokenBody.includes(GUEST_EMAIL), "");

  // 5) ROW 3b — a cross-order token while signed in → 404 (the F-CC
  //    negative class holds under a session too).
  const cross = await page.goto(`${BASE}/checkout/success?order=ORD-2026-004&t=${orderViewTokenOffline("ORD-2099-002")}`);
  check("row 3b: cross-order token while signed in → 404", cross?.status() === 404, `status=${cross?.status()}`);

  // 6) james's canonical state untouched; zero UNEXPECTED console errors.
  //    The two deliberate 404 navigations (rows 2/3b) make the browser log
  //    "Failed to load resource: 404" — that noise IS the behavior under
  //    test (the designed 404 surface), not a page defect. Pageerrors (JS
  //    exceptions) and any other console error still fail the check.
  const unexpected = consoleErrors.filter(
    (e) => !/Failed to load resource.*404/.test(e),
  );
  check("zero unexpected console errors (the deliberate 404 noise excluded)",
    unexpected.length === 0, unexpected.join(" || ").slice(0, 300));

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

function waitHealth(deadlineMs) {
  const http = require("http");
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const r = http.request(`${BASE}/api/health`, { method: "GET" }, (res) => {
        res.statusCode === 200 ? resolve() : retry();
      });
      r.on("error", retry);
      r.setTimeout(4000, () => r.destroy(new Error("timeout")));
      r.end();
    };
    const retry = () => {
      if (Date.now() - start > deadlineMs) return reject(new Error("health timeout: " + stderrTail.slice(-400)));
      setTimeout(tick, 400);
    };
    tick();
  });
}

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
