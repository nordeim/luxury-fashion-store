#!/usr/bin/env node
// Session-31 plan-validation probe — wire-verifies the F-BB contract
// assumptions BEFORE the spec is written (the session-29/30 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3205
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB —
// the probe's cart/wishlist/session rows land in the copy and die with it),
// then drives real Chromium through the three cookie-minting flows and
// asserts the BROWSER-ENFORCED cookie state via context.cookies() — the
// strongest witness: not the header string Next serialized, but the flags
// the browser actually parsed, stored, and will enforce. Exits nonzero on
// any assumption failure.
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const fs = require("fs");
const http = require("http");

const PORT = 3205;
const BASE = `http://localhost:${PORT}`;
const PDP = "/product/silk-draped-evening-gown";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe's writes never touch db/custom.db.
const PROBE_DB = `/tmp/probe-session31-${process.pid}.db`;

function req(path) {
  return new Promise((resolve, reject) => {
    const r = http.request(`${BASE}${path}`, { method: "GET" }, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers }));
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

// The contract the F-BB spec will pin (the declared shape in
// src/lib/auth.ts:88-96 + src/lib/cart.ts:112-118/140-146): HttpOnly +
// SameSite=Lax + Secure (production standalone) + Path=/, ~30-day
// persistence (SESSION_TTL_DAYS=30 / maxAge 2592000), and the cart/wishlist
// tokens are the declared 192-bit random hex (24 bytes → 48 hex chars).
const DAY_MS = 24 * 60 * 60 * 1000;

function cookieChecks(check, label, jar, name, opts) {
  const c = jar.find((k) => k.name === name);
  check(`${label}: ${name} minted`, !!c, `cookies: [${jar.map((k) => k.name).join(", ")}]`);
  if (!c) return;
  check(`${label}: ${name} httpOnly`, c.httpOnly === true, `got ${c.httpOnly}`);
  check(`${label}: ${name} sameSite=Lax`, c.sameSite === "Lax", `got ${c.sameSite}`);
  check(`${label}: ${name} secure (production standalone)`, c.secure === true, `got ${c.secure}`);
  check(`${label}: ${name} path=/`, c.path === "/", `got ${c.path}`);
  const age = c.expires * 1000 - Date.now();
  check(
    `${label}: ${name} ~30d persistence`,
    age > 29 * DAY_MS && age < 31 * DAY_MS,
    `got ${(age / DAY_MS).toFixed(2)}d`
  );
  if (opts.hex192) {
    check(`${label}: ${name} 192-bit token (48 hex)`, /^[0-9a-f]{48}$/.test(c.value), `got len ${c.value.length}`);
  } else {
    check(`${label}: ${name} value nonempty`, c.value.length > 10, `got len ${c.value.length}`);
  }
}

async function main() {
  const results = [];
  const check = (name, cond, detail) =>
    results.push({ name, ok: !!cond, detail: detail || "" });

  const browser = await chromium.launch();

  // Flow A — guest add-to-bag mints aurelia_cart (fresh cookie-less context;
  // the PDP preselects sizes[0], so the CTA posts directly).
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}${PDP}`, { waitUntil: "domcontentloaded" });
    await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
    await page.getByTestId("cart-drawer").waitFor({ state: "visible", timeout: 10_000 });
    const jar = await ctx.cookies();
    cookieChecks(check, "cart flow", jar, "aurelia_cart", { hex192: true });
    await ctx.close();
  }

  // Flow B — guest wishlist toggle mints aurelia_wishlist (fresh context ⇒
  // a fresh wishlist row ⇒ the CTA starts at "Add to Wishlist").
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}${PDP}`, { waitUntil: "domcontentloaded" });
    const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
    await wishBtn.waitFor({ state: "visible", timeout: 10_000 });
    if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
      await wishBtn.click(); // normalize to "not in wishlist" first
      await page.getByRole("button", { name: /Add to Wishlist/i }).waitFor({ timeout: 10_000 });
    }
    await page.locator("main").getByRole("button", { name: /Add to Wishlist/i }).first().click();
    await page
      .locator("main")
      .getByRole("button", { name: /In Wishlist/i })
      .first()
      .waitFor({ timeout: 10_000 });
    const jar = await ctx.cookies();
    cookieChecks(check, "wishlist flow", jar, "aurelia_wishlist", { hex192: true });
    await ctx.close();
  }

  // Flow C — login mints aurelia_session (the demo customer; the probe's
  // limiter is its own instance on its own boot — zero E2E-bucket cost).
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill("james@example.com");
    await page.getByLabel("Password").fill("Demo1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/account/, { timeout: 15_000 });
    const jar = await ctx.cookies();
    cookieChecks(check, "login flow", jar, "aurelia_session", { hex192: false });
    await ctx.close();
  }

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
    AUTH_SECRET: "session31-probe-secret-0123456789abcdef",
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
