#!/usr/bin/env node
// Session-34 plan-validation probe — wire-verifies the F-EE contract
// assumptions BEFORE the spec is written (the session-29…33 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3207
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB —
// the probe's registered user + wishlist rows land in the copy and die
// with it), then pins the guest wishlist merge's wire behavior:
//   - register (fresh email) → sign-out → guest heart toggle mints the
//     declared 192-bit hex cookie + a GUEST Wishlist row (userId null);
//   - login-as-the-fresh-user through the real form (?redirect=/wishlist
//     honored) → the merged item renders on /wishlist and PERSISTS a
//     reload (server truth);
//   - the G-5 visible half: the wishlist cookie is CLEARED from the jar;
//   - the cleanup half: the guest row is GONE by the captured token, and
//     the user's list holds the item (Prisma join — truth beyond the DOM);
//   - james's canonical state untouched; zero console errors.
// Exits nonzero on any assumption failure.
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const http = require("http");

const PORT = 3207;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session34-probe-secret-0123456789abcdef";
const PRODUCT = "wide-brim-felt-hat";
const EMAIL = `e2e-merge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const PASSWORD = "MergeTest123";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe's writes never touch db/custom.db.
const PROBE_DB = `/tmp/probe-session34-${process.pid}.db`;
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

  // Prisma on the COPY — the server-truth witness for every DB-side claim.
  const pdb = new PrismaClient({ datasources: { db: { url: PROBE_DB_URL } } });

  // Canonical sanity: james's state untouched by everything below.
  const jamesBefore = await pdb.user.findUnique({
    where: { email: "james@example.com" },
    select: { id: true, wishlist: { select: { id: true, items: true } }, orders: { select: { id: true } } },
  });
  // The canonical seed: ORD-2026-001/002/003 belong to james; ORD-2026-004
  // is the GUEST order — the "4" of 4/12/2/4 is the TABLE count, james owns 3.
  check("james canonical on the copy (3 orders, 0 wishlist items)",
    jamesBefore?.orders.length === 3 && (jamesBefore?.wishlist?.items.length ?? 0) === 0,
    `orders=${jamesBefore?.orders.length} wishItems=${jamesBefore?.wishlist?.items.length ?? 0}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext(); // fresh context ⇒ the full guest journey
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // 1) Register a fresh account with NO guest cookie — the register merge
  //    no-ops (`if (!token) return`), leaving the fresh user's list empty.
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Name").fill("Merge Probe");
  await page.getByLabel("Email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#confirmPassword").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15_000 });
  check("register lands on /account", /\/account$/.test(new URL(page.url()).pathname), page.url());

  // 2) Sign out — the auth.spec shape (the account page's Sign out control).
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/$/, { timeout: 15_000 });
  check("sign-out returns to the storefront", /\/$/.test(new URL(page.url()).pathname), page.url());

  // 3) Guest heart toggle on the distinctive product (hearted by NO other spec).
  await page.goto(`${BASE}/product/${PRODUCT}`, { waitUntil: "domcontentloaded" });
  const wishBtn = page.locator("main").getByRole("button", { name: /wishlist/i }).first();
  if ((await wishBtn.textContent())?.match(/In Wishlist/i)) {
    await wishBtn.click();
    await wishBtn.waitFor({ state: "visible" });
  }
  await wishBtn.click();
  await expectText(wishBtn, /In Wishlist/i);
  check("guest toggle flips the PDP CTA to In Wishlist", true, "");

  // 4) The guest cookie mints with the declared 192-bit hex shape (the F-BB
  //    pin's shape assertion re-used as a sanity gate on the captured token).
  const wlCookie = (await ctx.cookies()).find((c) => c.name === "aurelia_wishlist");
  check("aurelia_wishlist in the guest jar", !!wlCookie, "missing");
  check("the token is the declared 192-bit hex", /^[0-9a-f]{48}$/.test(wlCookie?.value ?? ""), wlCookie?.value?.slice(0, 12));
  const guestToken = wlCookie.value;

  // 5) Server truth: a GUEST Wishlist row exists for that token (userId null).
  const guestRow = await pdb.wishlist.findUnique({
    where: { token: guestToken },
    select: { id: true, userId: true, items: { select: { productId: true } } },
  });
  const product = await pdb.product.findUnique({ where: { slug: PRODUCT }, select: { id: true } });
  check("the guest Wishlist row exists (userId null)", !!guestRow && guestRow.userId === null,
    guestRow ? `userId=${guestRow.userId}` : "missing");
  check("the guest row holds the hearted product",
    !!guestRow && !!product && guestRow.items.some((i) => i.productId === product.id), "");

  // 6) Login as the fresh user through the real form — the LOGIN door runs
  //    mergeGuestWishlistIntoUser with the guest cookie present.
  await page.goto(`${BASE}/login?redirect=/wishlist`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Pathname predicate — /\/wishlist/ would match the ?redirect=/wishlist
  // QUERY on the pre-navigation /login URL (the probe's own first-draft bug).
  await page.waitForURL((u) => new URL(u).pathname === "/wishlist", { timeout: 15_000 });
  check("login honors ?redirect=/wishlist", new URL(page.url()).pathname === "/wishlist", page.url());

  // 7) The merged item renders — and PERSISTS a reload (server rows).
  const grid = page.getByTestId("wishlist-grid");
  await grid.waitFor({ state: "visible", timeout: 10_000 });
  const gridHasHat = await grid.getByRole("link").first().getAttribute("href");
  check("the merged wishlist shows the felt hat", (gridHasHat ?? "").includes(PRODUCT), gridHasHat ?? "empty grid");
  await page.reload({ waitUntil: "domcontentloaded" });
  const gridAfterReload = page.getByTestId("wishlist-grid");
  await gridAfterReload.waitFor({ state: "visible", timeout: 10_000 });
  const hrefAfterReload = await gridAfterReload.getByRole("link").first().getAttribute("href");
  check("the merged item persists a reload (server truth)", (hrefAfterReload ?? "").includes(PRODUCT), hrefAfterReload ?? "empty grid");

  // 8) The G-5 visible half: the wishlist cookie is CLEARED from the jar.
  const cookieAfter = (await ctx.cookies()).find((c) => c.name === "aurelia_wishlist");
  check("aurelia_wishlist cleared post-login", !cookieAfter, cookieAfter ? "still present" : "");

  // 9) The cleanup half: the guest row is GONE by the captured token.
  const guestRowAfter = await pdb.wishlist.findUnique({ where: { token: guestToken }, select: { id: true } });
  check("the guest Wishlist row is deleted", !guestRowAfter, guestRowAfter ? `still present ${guestRowAfter.id}` : "");

  // 10) Truth beyond the DOM: the user's list holds the item.
  const freshUser = await pdb.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, wishlist: { select: { items: { select: { productId: true } } } } },
  });
  check("the user's list holds the merged item (Prisma join)",
    !!freshUser && !!product && (freshUser.wishlist?.items ?? []).some((i) => i.productId === product.id),
    `items=${freshUser?.wishlist?.items.length ?? "no user"}`);

  // 11) james untouched; zero console errors on /wishlist.
  const jamesAfter = await pdb.user.findUnique({
    where: { email: "james@example.com" },
    select: { wishlist: { select: { items: true } }, orders: { select: { id: true } } },
  });
  check("james untouched (3 orders, 0 wishlist items)",
    jamesAfter?.orders.length === 3 && (jamesAfter?.wishlist?.items.length ?? 0) === 0, "");
  check("zero console errors on the journey", consoleErrors.length === 0, consoleErrors.join(" || ").slice(0, 300));

  await pdb.$disconnect();
  await ctx.close();
  await browser.close();

  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  ||  " + r.detail}`);
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

async function expectText(locator, pattern) {
  await locator.filter({ hasText: pattern }).waitFor({ state: "visible", timeout: 10_000 });
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
