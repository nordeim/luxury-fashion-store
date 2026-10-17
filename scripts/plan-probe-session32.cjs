#!/usr/bin/env node
// Session-32 plan-validation probe — wire-verifies the F-CC contract
// assumptions BEFORE the spec is written (the session-29/30/31 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3206
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB —
// the probe's cart/order rows land in the copy and die with it), drives the
// real guest COD checkout to its confirmation URL, then pins the capability
// gate's wire behavior: the minted ?order=&t= pair serves, every rejected
// variant (absent / wrong / cross-order / unknown order) 404s with the
// not-found card and leaks no guest PII. Also proves the OFFLINE HMAC
// reproduction assumption (the spec's cross-order negative is computed with
// the shared E2E_AUTH_SECRET — here the probe's own secret) BEFORE the spec
// relies on it. Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const { createHmac } = require("node:crypto");
const { chromium } = require("playwright");
const fs = require("fs");
const http = require("http");

const PORT = 3206;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session32-probe-secret-0123456789abcdef";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe's writes never touch db/custom.db.
const PROBE_DB = `/tmp/probe-session32-${process.pid}.db`;

// The declared shape (src/lib/order-token.ts): HMAC-SHA256 over
// `order-view:${orderNumber}`, hex, first 40 chars — computed with the
// boot's AUTH_SECRET. The probe reproduces it OFFLINE to prove the spec's
// cross-order negative (an offline-minted token) hits the real verify seam.
function orderViewToken(orderNumber) {
  return createHmac("sha256", SECRET).update(`order-view:${orderNumber}`).digest("hex").slice(0, 40);
}

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

  const browser = await chromium.launch();
  const ctx = await browser.newContext(); // fresh cookie-less context ⇒ GUEST checkout
  const page = await ctx.newPage();

  // The proven COD flow (cart-checkout.spec.ts): PDP preselects sizes[0],
  // one click fills the drawer; the wizard is Shipping → Payment(COD) → Review.
  await page.goto(`${BASE}/product/silk-draped-evening-gown`, { waitUntil: "domcontentloaded" });
  await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
  await page.getByTestId("cart-drawer").waitFor({ state: "visible", timeout: 10_000 });
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });

  const GUEST_EMAIL = "james@example.com";
  await page.getByLabel("Email", { exact: true }).fill(GUEST_EMAIL);
  await page.getByLabel("Full Name").fill("James Whitmore");
  await page.getByLabel("Street Address").fill("212 Mercer Street, Apt 4B");
  await page.getByLabel("City").fill("New York");
  await page.getByLabel("State").fill("NY");
  await page.getByLabel("ZIP").fill("10012");
  await page.getByRole("button", { name: "Continue to Payment" }).click();
  await page.getByText("Cash on Delivery").click();
  await page.getByRole("button", { name: "Review Order" }).click();
  await page.getByRole("button", { name: /place order/i }).click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 20_000 });

  const url = new URL(page.url());
  const order = url.searchParams.get("order") || "";
  const token = url.searchParams.get("t") || "";

  check("flow lands on /checkout/success", /\/checkout\/success$/.test(url.pathname), url.pathname);
  check("URL carries the order number (ORD-YYYY-NNN)", /^ORD-\d{4}-\d{3}$/.test(order), order);
  check("URL carries the 40-hex view token t", /^[0-9a-f]{40}$/.test(token), `len ${token.length}`);
  check(
    "offline HMAC reproduces the minted token (shared-secret assumption)",
    orderViewToken(order) === token,
    orderViewToken(order) === token ? "match" : "MISMATCH — spec's offline cross-order negative would be invalid"
  );

  // Positive path — a direct fetch of the captured URL serves the confirmation.
  const ok = await req(`/checkout/success?order=${order}&t=${token}`);
  check("captured URL serves 200", ok.status === 200, `got ${ok.status}`);
  check("positive body shows the order number", ok.body.includes(order), "");
  check("positive body shows the guest email (the PII the gate protects)", ok.body.includes(GUEST_EMAIL), "");

  // Negative paths — every rejected variant 404s into the not-found card.
  const absent = await req(`/checkout/success?order=${order}`);
  check("absent token 404s", absent.status === 404, `got ${absent.status}`);

  const flipped = (token[0] === "0" ? "1" : "0") + token.slice(1);
  const wrong = await req(`/checkout/success?order=${order}&t=${flipped}`);
  check("wrong token 404s", wrong.status === 404, `got ${wrong.status}`);

  const crossToken = orderViewToken("ORD-2099-002");
  const cross = await req(`/checkout/success?order=${order}&t=${crossToken}`);
  check("cross-order token 404s (not capability tokens)", cross.status === 404, `got ${cross.status}`);

  const unknown = await req(`/checkout/success?order=ORD-2099-001&t=${orderViewToken("ORD-2099-001")}`);
  check("unknown order + its own valid token 404s (no existence leak)", unknown.status === 404, `got ${unknown.status}`);

  for (const [label, res] of [["absent", absent], ["wrong", wrong], ["cross", cross], ["unknown", unknown]]) {
    check(`${label}: 404 renders the not-found card`, res.body.includes("Page Not Found"), "");
    check(`${label}: 404 leaks no guest email`, !res.body.includes(GUEST_EMAIL), "");
  }

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
    DATABASE_URL: `file:${PROBE_DB}`,
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
