#!/usr/bin/env node
// Session-42 plan-validation probe — wire-verifies the F-MM contract
// assumptions BEFORE the spec is written (the session-29…41 §6 discipline:
// no unverified assumption enters a pin). Boots the standalone on :3209
// against a THROWAWAY COPY of db/custom.db (zero writes touch the dev DB
// or db/e2e.db), then drives the REAL COD checkout flow on the copy:
//   - the james session is minted OFFLINE (a random 256-bit token + its
//     HMAC'd cookie, backed by a Session row inserted via prisma db execute
//     with james's id resolved by the DB itself — the F-II/F-HH pattern);
//   - the minted cookie + row render /account signed-in (the mint's WIRE
//     VALIDITY);
//   - the capture-before read: the victim product's stock S (never
//     hardcoded — immune to drift);
//   - the REAL COD wizard flow places an order end-to-end (PDP add →
//     /checkout → Shipping → Payment(COD) → Review → Place) and lands the
//     success URL;
//   - the order number parses from the success URL (the F-CC shape);
//   - LOAD-BEARING: the three server-truth halves of placeOnce's
//     transaction (the exact dbRead expressions the spec will use):
//       1. the victim's stock === S - 1 (the per-item decrement — the
//          oversell guard's own write);
//       2. the new order's events: EXACTLY 1 row, type 'placed', actor
//          null (the timeline seed both sides render);
//       3. james's CartItem count === 0 (the post-placement purge);
//   - the purge's wire-real half: a FRESH /cart render shows "Your bag is
//     empty" (server-rendered — not the client store's EMPTY_CART);
//   - the confirmation renders the parsed order number;
//   - zero unexpected console errors.
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { randomBytes, createHmac } = require("node:crypto");
const fs = require("fs");
const path = require("node:path");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session42-probe-secret-0123456789abcdef";
const USER_EMAIL = "james@example.com";
const VICTIM = "silk-draped-evening-gown";

// A throwaway DB copy — absolute URL passes the db-path resolver untouched
// (AGENTS.md pass-through path), so the probe never touches db/custom.db.
const PROBE_DB = `/tmp/probe-session42-${process.pid}.db`;
const PROBE_DB_URL = `file:${PROBE_DB}`;
const REPO = process.cwd();

// The offline mint (the a11y M-1 / F-II / F-HH pattern's cookie shape).
const TOKEN = randomBytes(32).toString("hex");
const COOKIE_VALUE = `${TOKEN}.${createHmac("sha256", SECRET).update(TOKEN).digest("base64url")}`;

function dbRead(jsonExpression) {
  const script = `const {PrismaClient}=require("@prisma/client");const p=new PrismaClient({datasources:{db:{url:"${PROBE_DB_URL}"}}});(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
  const res = spawnSync("node", ["-e", script], {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`dbRead failed: ${res.stderr?.slice(0, 300)}`);
  const marker = (res.stdout ?? "").indexOf("<<JSON>>");
  if (marker < 0) throw new Error(`dbRead produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
  return JSON.parse(res.stdout.slice(marker + "<<JSON>>".length).trim());
}

function sqlRun(sql) {
  const scratch = path.join(REPO, "tests", "e2e", ".probe42.sql");
  fs.writeFileSync(scratch, sql);
  try {
    const res = spawnSync(
      "npx",
      ["prisma", "db", "execute", "--schema", path.join(REPO, "prisma", "schema.prisma"), "--file", scratch],
      {
        cwd: REPO,
        env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      },
    );
    if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  } finally {
    try { fs.unlinkSync(scratch); } catch { /* already gone */ }
  }
}

async function main() {
  const results = [];
  const check = (name, cond, detail) =>
    results.push({ name, ok: !!cond, detail: detail || "" });

  // Throwaway copy of the dev DB (never the live dev/e2e file).
  fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

  // Deterministic start on the copy: james's cart empty (the canonical copy
  // ships it empty — belt-and-braces sweep of any stray rows).
  sqlRun(`DELETE FROM "CartItem" WHERE "cartId" IN (SELECT "id" FROM "Cart" WHERE "userId" IS NOT NULL);`);

  // Boot the standalone on the copy.
  const server = spawn("node", [path.join(REPO, ".next", "standalone", "server.js")], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", DATABASE_URL: PROBE_DB_URL, AUTH_SECRET: SECRET },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const serverErr = [];
  server.stderr.on("data", (d) => serverErr.push(String(d)));
  const waitHealth = async () => {
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`${BASE}/api/health`);
        if (res.ok) return;
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`probe server never became healthy: ${serverErr.join("").slice(0, 400)}`);
  };
  await waitHealth();

  const browser = await chromium.launch();
  const consoleErrors = [];

  // THE OFFLINE MINT — a fresh context carrying ONLY the minted cookie.
  const ctx = await browser.newContext();
  await ctx.addCookies([
    {
      name: "aurelia_session",
      value: COOKIE_VALUE,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false, // http://localhost — matches the setup projects' minted cookies
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 86_400,
    },
  ]);
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // check 1 — the minted JAMES row (INSERT…SELECT resolves james's id in the DB).
  sqlRun(
    `DELETE FROM "Session" WHERE token = '${TOKEN}';\n` +
      `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
      `SELECT 'fmm-probe-' || '${TOKEN.slice(0, 16)}', '${TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
      `FROM "User" WHERE email = '${USER_EMAIL}';`,
  );
  const minted = dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`);
  check("the offline-minted JAMES Session row exists (INSERT…SELECT, james resolved by the DB)", minted !== null, JSON.stringify(minted));

  // check 2 — the mint's WIRE VALIDITY: the cookie + row render /account signed-in.
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /account/i }).first().waitFor({ timeout: 10_000 }).catch(() => {});
  const onAccount = /\/account$/.test(new URL(page.url()).pathname);
  check("the minted cookie + row render /account signed-in (wire validity)", onAccount, page.url());

  // check 3 — the capture-before read: the victim's stock S (never hardcoded).
  const stockBefore = dbRead(`(p)=>p.product.findUnique({where:{slug:"${VICTIM}"},select:{stock:true}})`);
  check("the capture-before read: the victim's stock S resolves (never hardcoded)", stockBefore !== null && stockBefore.stock > 0, JSON.stringify(stockBefore));
  const S = stockBefore ? stockBefore.stock : -1;

  // check 4 — the REAL COD wizard flow places an order end-to-end.
  await page.goto(`${BASE}/product/${VICTIM}`, { waitUntil: "domcontentloaded" });
  await page.locator("main").getByRole("button", { name: "Add to Bag" }).first().click();
  await page.getByTestId("cart-drawer").waitFor({ timeout: 10_000 });
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  // Signed-in sessions prefill the name (no email field — the F-FF context).
  await page.getByLabel("Full Name").fill("James Whitmore");
  await page.getByLabel("Street Address").fill("212 Mercer Street, Apt 4B");
  await page.getByLabel("City").fill("New York");
  await page.getByLabel("State").fill("NY");
  await page.getByLabel("ZIP").fill("10012");
  await page.getByRole("button", { name: "Continue to Payment" }).click();
  await page.getByText("Cash on Delivery").waitFor({ timeout: 10_000 });
  await page.getByText("Cash on Delivery").click();
  await page.getByRole("button", { name: "Review Order" }).click();
  await page.getByRole("button", { name: /place order/i }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /place order/i }).click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 20_000 });
  const successUrl = new URL(page.url());
  const orderNumber = successUrl.searchParams.get("order") || "";
  check("the REAL COD wizard flow places an order and lands the success URL", /^ORD-\d{4}-\d{3}$/.test(orderNumber), `order=${orderNumber} url=${page.url()}`);

  // check 5 — the order number parses from the success URL (the F-CC shape).
  check("the order number parses from the success URL (ORD-YYYY-NNN)", orderNumber.startsWith("ORD-"), orderNumber);

  // check 6 — LOAD-BEARING #1: the decrement half (stock === S - 1).
  const stockAfter = dbRead(`(p)=>p.product.findUnique({where:{slug:"${VICTIM}"},select:{stock:true}})`);
  check(`LOAD-BEARING #1: the victim's stock decremented exactly 1 (${S} -> ${S - 1})`, stockAfter !== null && stockAfter.stock === S - 1, JSON.stringify(stockAfter));

  // check 7 — LOAD-BEARING #2: the 'placed' OrderEvent mint (exactly 1, actor null).
  const events = dbRead(
    `(p)=>p.orderEvent.findMany({where:{order:{number:"${orderNumber}"}},select:{type:true,actor:true,note:true},orderBy:{createdAt:"asc"}})`,
  );
  const placedEvents = Array.isArray(events) ? events.filter((e) => e.type === "placed") : [];
  check(
    "LOAD-BEARING #2: the new order carries EXACTLY 1 'placed' event, actor 'system' (the timeline seed — the F-16 customer-visible class)",
    Array.isArray(events) && events.length === 1 && placedEvents.length === 1 && events[0].actor === "system",
    `events=${JSON.stringify(events)}`,
  );

  // check 8 — LOAD-BEARING #3: the purge (james's CartItem count === 0).
  const cartLines = dbRead(
    `(p)=>p.cartItem.count({where:{cart:{userId:{not:null}}}})`,
  );
  check("LOAD-BEARING #3: james's cart lines === 0 after placement (the purge)", cartLines === 0, `count=${cartLines}`);

  // check 9 — the purge's wire-real half: a FRESH /cart render shows the empty state.
  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  const emptyText = await page.getByText("Your bag is empty").waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
  check("the purge's wire-real half: a FRESH /cart render shows 'Your bag is empty' (server-rendered)", emptyText, `visible=${emptyText}`);

  // check 10 — the confirmation renders the parsed order number (SUPPORTING).
  await page.goto(`${BASE}/checkout/success?order=${orderNumber}`, { waitUntil: "domcontentloaded" });
  const confirmationText = (await page.getByText(new RegExp(orderNumber.replace("-", "\\-"))).first().waitFor({ timeout: 10_000 }).then(() => true).catch(() => false));
  check("the confirmation renders the parsed order number (the owner capability row)", confirmationText, `order=${orderNumber}`);

  check("zero unexpected console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  server.kill("SIGKILL");

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log(`\nprobe-session42: ${results.length - failed.length}/${results.length} checks passed`);
  try { fs.unlinkSync(PROBE_DB); } catch { /* best effort */ }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
