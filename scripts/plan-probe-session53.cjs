#!/usr/bin/env node
// Session-53 plan-validation probe — wire-verifies the F-XX contract
// assumptions BEFORE the spec is written (the standing §4 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db with
// the sweeper fixtures minted on the copy BEFORE spawn — the F-XX-specific
// order: the BOOT sweep (instrumentation register() → runSweep()) must FIND
// the fixtures at boot, the first test-time happy-path execution of the
// runtime seam anywhere (the harness webServer's own boot P2021-soft-skips
// every run against the schema-less db/e2e.db; the hourly interval never
// fires inside a suite run). A SECOND throwaway spawn against a SCHEMA-LESS
// tmpdir database proves the F-J soft-skip wiring explicitly (the boot
// sweep P2021s and the classifier downgrades it — the server still boots
// and serves health with db:false, the F-OO honest-degradation shape).
// Zero writes touch the dev DB or db/e2e.db (each read once at copyFileSync;
// the schema-less spawn creates only its own empty file).
//
// Checks (all on the wire / server-truth):
//   1. the fixtures mint on the copy and every one is present PRE-SPAWN
//      (the captured-baselines pattern);
//   2. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true}) — register() runs in the standalone;
//   3. THE BOOT SWEEP FIRES AND COMPLETES: the PAST-expiry session fixture
//      and the 40-day-idle guest cart fixture are GONE from the copy,
//      observed by POLLING the copy's SQLite from the probe side with a
//      bounded deadline (register() launches runSweep() UNAWAITED — the
//      health 200 does not imply sweep completion; the poll is the
//      deterministic join);
//   4. THE KEEP MATRIX: the FUTURE-expiry session, the RECENT guest cart,
//      the RECENT guest wishlist, and the USER-OWNED 40-day-idle cart all
//      SURVIVE (the userId:null ownership discriminator, on the wire);
//   5. THE CASCADE: the idle cart's CartItem is GONE with its parent
//      (onDelete: Cascade — the sweep must not orphan lines); the recent
//      cart's item SURVIVES;
//   6. THE WISHLIST HALF: the idle guest wishlist + its WishlistItem are
//      GONE; the recent wishlist SURVIVES;
//   7. the health endpoint still answers 200 + db:true post-sweep (the
//      sweep never broke the server);
//   8. THE F-J SOFT-SKIP, EXPLICIT: the schema-less spawn boots + serves
//      health 200 with db:false AND the child's stderr carries the exact
//      "[sweeper] boot sweep skipped: database schema not ready yet"
//      downgrade line (the wiring every harness run proves implicitly,
//      now on demand);
//   9. cleanup confirmed (both children killed, both tmpdirs gone).
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session53-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");

// The throwaway DBs: a copy of the dev DB (deleted with the probe) + a
// schema-less empty file for the F-J half.
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe-session53-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;
const TMPDIR2 = path.join(TMPDIR, "schemaless");
fs.mkdirSync(TMPDIR2);
const EMPTY_DB = path.join(TMPDIR2, "empty.db");
const EMPTY_DB_URL = `file:${EMPTY_DB}`;

const SUFFIX = crypto.randomBytes(6).toString("hex");
const SESSION_PAST_ID = `fxx-sx-${SUFFIX}`;
const SESSION_FUTURE_ID = `fxx-sf-${SUFFIX}`;
const SESSION_PAST_TOKEN = `fxx-stp-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const SESSION_FUTURE_TOKEN = `fxx-stf-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const CART_IDLE_TOKEN = `fxx-ti-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const CART_RECENT_TOKEN = `fxx-tr-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const CART_USER_TOKEN = `fxx-tu-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const CART_IDLE_ID = `fxx-ci-${SUFFIX}`;
const CART_RECENT_ID = `fxx-cr-${SUFFIX}`;
const CART_USER_ID = `fxx-cu-${SUFFIX}`;
const ITEM_IDLE_ID = `fxx-ii-${SUFFIX}`;
const ITEM_RECENT_ID = `fxx-ir-${SUFFIX}`;
const WISHLIST_IDLE_TOKEN = `fxx-wi-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const WISHLIST_RECENT_TOKEN = `fxx-wr-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const WISHLIST_IDLE_ID = `fxx-li-${SUFFIX}`;
const WISHLIST_RECENT_ID = `fxx-lr-${SUFFIX}`;
const WISH_ITEM_IDLE_ID = `fxx-ji-${SUFFIX}`;

let passCount = 0;
let failCount = 0;
function results(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (ok) passCount++;
  else { failCount++; process.exitCode = 1; }
}

/** Boot the standalone against a DATABASE_URL; resolve {child, stderrTail}. */
function bootServer(databaseUrl) {
  const child = spawn("node", [STANDALONE], {
    cwd: REPO,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      AUTH_SECRET: SECRET,
      DATABASE_URL: databaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderrTail = "";
  child.stderr.on("data", (chunk) => { stderrTail = (stderrTail + String(chunk)).slice(-1600); });
  const deadline = Date.now() + 25_000;
  return new Promise((resolve, reject) => {
    (async function poll() {
      if (Date.now() > deadline) {
        child.kill("SIGKILL");
        reject(new Error(`server never listened — stderr: ${stderrTail.slice(0, 400)}`));
        return;
      }
      try {
        const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) { resolve({ child, stderrTail: () => stderrTail }); return; }
      } catch { /* not up yet */ }
      setTimeout(poll, 400);
    })();
  });
}

/** SQL fixture on the COPY (the established `prisma db execute` pattern). */
function sqlRun(sql) {
  const file = path.join(TMPDIR, "fixture.sql");
  fs.writeFileSync(file, sql);
  const res = spawnSync("npx", ["prisma", "db", "execute", "--schema", path.join(REPO, "prisma", "schema.prisma"), "--file", file], {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: PROBE_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  fs.unlinkSync(file);
}

/** Read rows through Prisma on the COPY (the F-II/F-KK/F-SS helper's shape). */
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

async function readRow(expr) {
  return dbRead(expr);
}

/** Kill a child with SIGTERM → SIGKILL escalation; resolve on exit. */
function killChild(child) {
  return new Promise((resolve) => {
    const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
    child.on("exit", () => { clearTimeout(force); resolve(); });
    child.kill("SIGTERM");
  });
}

(async function main() {
  let healthy = null;
  let schemaless = null;
  try {
    // The healthy throwaway COPY of the seeded dev DB, fixtures minted
    // BEFORE spawn (the boot sweep must find them at register() time).
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);
    // THE ROUND'S HARNESS DISCOVERY (probe first run): Prisma 6's SQLite
    // connector stores DateTime columns as INTEGER EPOCH MILLISECONDS —
    // raw-SQL datetime()/strftime() write TEXT, and in SQLite's
    // cross-storage-class ordering INTEGER < TEXT ALWAYS, so
    // `updatedAt < <integer-param>` is FALSE for every TEXT-stored row: the
    // sweeper's where-clause can NEVER match a datetime()-written fixture
    // (the probe's first run caught exactly this — the fixtures survived a
    // healthy sweep). Every datetime below is written as
    // strftime('%s','now',±N)*1000 — integer ms, Prisma's own format.
    sqlRun(
      `DELETE FROM "WishlistItem" WHERE "id" = '${WISH_ITEM_IDLE_ID}';\n` +
        `DELETE FROM "Wishlist" WHERE "id" IN ('${WISHLIST_IDLE_ID}','${WISHLIST_RECENT_ID}');\n` +
        `DELETE FROM "CartItem" WHERE "id" IN ('${ITEM_IDLE_ID}','${ITEM_RECENT_ID}');\n` +
        `DELETE FROM "Cart" WHERE "id" IN ('${CART_IDLE_ID}','${CART_RECENT_ID}','${CART_USER_ID}');\n` +
        `DELETE FROM "Session" WHERE "id" IN ('${SESSION_PAST_ID}','${SESSION_FUTURE_ID}');\n` +
        `INSERT INTO "Session" ("id","token","userId","expiresAt","createdAt") VALUES ` +
        `('${SESSION_PAST_ID}','${SESSION_PAST_TOKEN}',(SELECT "id" FROM "User" WHERE "email"='james@example.com'),(strftime('%s','now','-1 day')*1000),(strftime('%s','now')*1000));\n` +
        `INSERT INTO "Session" ("id","token","userId","expiresAt","createdAt") VALUES ` +
        `('${SESSION_FUTURE_ID}','${SESSION_FUTURE_TOKEN}',(SELECT "id" FROM "User" WHERE "email"='james@example.com'),(strftime('%s','now','+1 day')*1000),(strftime('%s','now')*1000));\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") VALUES ` +
        `('${CART_IDLE_ID}','${CART_IDLE_TOKEN}',NULL,(strftime('%s','now','-40 days')*1000),(strftime('%s','now','-40 days')*1000));\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") VALUES ` +
        `('${CART_RECENT_ID}','${CART_RECENT_TOKEN}',NULL,(strftime('%s','now')*1000),(strftime('%s','now')*1000));\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") VALUES ` +
        `('${CART_USER_ID}','${CART_USER_TOKEN}',(SELECT "id" FROM "User" WHERE "email"='james@example.com'),(strftime('%s','now','-40 days')*1000),(strftime('%s','now','-40 days')*1000));\n` +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") VALUES ` +
        `('${ITEM_IDLE_ID}','${CART_IDLE_ID}',(SELECT "id" FROM "Product" WHERE "slug"='leather-crossbody-bag'),'M',1,(strftime('%s','now','-40 days')*1000),(strftime('%s','now','-40 days')*1000));\n` +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") VALUES ` +
        `('${ITEM_RECENT_ID}','${CART_RECENT_ID}',(SELECT "id" FROM "Product" WHERE "slug"='leather-crossbody-bag'),'M',2,(strftime('%s','now')*1000),(strftime('%s','now')*1000));\n` +
        `INSERT INTO "Wishlist" ("id","token","userId","createdAt","updatedAt") VALUES ` +
        `('${WISHLIST_IDLE_ID}','${WISHLIST_IDLE_TOKEN}',NULL,(strftime('%s','now','-40 days')*1000),(strftime('%s','now','-40 days')*1000));\n` +
        `INSERT INTO "Wishlist" ("id","token","userId","createdAt","updatedAt") VALUES ` +
        `('${WISHLIST_RECENT_ID}','${WISHLIST_RECENT_TOKEN}',NULL,(strftime('%s','now')*1000),(strftime('%s','now')*1000));\n` +
        `INSERT INTO "WishlistItem" ("id","wishlistId","productId","createdAt") VALUES ` +
        `('${WISH_ITEM_IDLE_ID}','${WISHLIST_IDLE_ID}',(SELECT "id" FROM "Product" WHERE "slug"='leather-crossbody-bag'),(strftime('%s','now','-40 days')*1000));\n`,
    );

    // --- 1. pre-spawn sanity: every fixture present on the copy ------------
    const pre = await Promise.all([
      readRow(`(p)=>p.session.findUnique({where:{id:"${SESSION_PAST_ID}"},select:{id:true}})`),
      readRow(`(p)=>p.session.findUnique({where:{id:"${SESSION_FUTURE_ID}"},select:{id:true}})`),
      readRow(`(p)=>p.cart.findUnique({where:{token:"${CART_IDLE_TOKEN}"},select:{id:true}})`),
      readRow(`(p)=>p.cart.findUnique({where:{token:"${CART_RECENT_TOKEN}"},select:{id:true}})`),
      readRow(`(p)=>p.cart.findUnique({where:{token:"${CART_USER_TOKEN}"},select:{id:true}})`),
      readRow(`(p)=>p.cartItem.findUnique({where:{id:"${ITEM_IDLE_ID}"},select:{id:true}})`),
      readRow(`(p)=>p.wishlist.findUnique({where:{token:"${WISHLIST_IDLE_TOKEN}"},select:{id:true}})`),
      readRow(`(p)=>p.wishlist.findUnique({where:{token:"${WISHLIST_RECENT_TOKEN}"},select:{id:true}})`),
    ]);
    const preOk = pre.every((r) => r !== null);
    results("1. fixtures minted + all present pre-spawn", preOk,
      preOk ? "8/8 rows" : `missing: ${pre.map((r, i) => (r === null ? i : null)).filter(Boolean).join(",")}`);

    // --- 2. boot + health ---------------------------------------------------
    healthy = await bootServer(PROBE_DB_URL);
    const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBody = await health.text();
    results("2. healthy copy boots + health 200 + db:true",
      health.status === 200 && healthBody.includes('"db":true'), healthBody.slice(0, 80));

    // --- 3. the boot sweep fires + completes (the poll join) ----------------
    // register() launches runSweep() UNAWAITED — poll the copy until the
    // idle cart row disappears, bounded deadline. A never-firing sweep
    // fails HERE (this is exactly the spec's poll contract).
    const sweepDeadline = Date.now() + 25_000;
    let idleCartGone = false;
    let sessionPastGone = false;
    while (Date.now() < sweepDeadline) {
      const [cart, sess] = await Promise.all([
        readRow(`(p)=>p.cart.findUnique({where:{token:"${CART_IDLE_TOKEN}"},select:{id:true}})`),
        readRow(`(p)=>p.session.findUnique({where:{id:"${SESSION_PAST_ID}"},select:{id:true}})`),
      ]);
      if (cart === null) idleCartGone = true;
      if (sess === null) sessionPastGone = true;
      if (idleCartGone && sessionPastGone) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    results("3a. the boot sweep deleted the 40-day-idle guest cart", idleCartGone,
      idleCartGone ? "row gone" : "row still present after 25s — the sweep never fired");
    results("3b. the boot sweep deleted the PAST-expiry session", sessionPastGone,
      sessionPastGone ? "row gone" : "row still present after 25s");

    // --- 4. the keep matrix --------------------------------------------------
    const [sessFuture, cartRecent, cartUser, wishRecent] = await Promise.all([
      readRow(`(p)=>p.session.findUnique({where:{id:"${SESSION_FUTURE_ID}"},select:{id:true}})`),
      readRow(`(p)=>p.cart.findUnique({where:{token:"${CART_RECENT_TOKEN}"},select:{id:true}})`),
      readRow(`(p)=>p.cart.findUnique({where:{token:"${CART_USER_TOKEN}"},select:{id:true}})`),
      readRow(`(p)=>p.wishlist.findUnique({where:{token:"${WISHLIST_RECENT_TOKEN}"},select:{id:true}})`),
    ]);
    results("4a. the FUTURE-expiry session SURVIVES the sweep", sessFuture !== null);
    results("4b. the RECENT guest cart SURVIVES the sweep", cartRecent !== null);
    results("4c. the USER-OWNED 40-day-idle cart SURVIVES (the ownership discriminator)",
      cartUser !== null, cartUser !== null ? "member bag intact" : "CATASTROPHIC: the sweep ate a member cart");
    results("4d. the RECENT guest wishlist SURVIVES the sweep", wishRecent !== null);

    // --- 5. the cascade ------------------------------------------------------
    const [itemIdle, itemRecent] = await Promise.all([
      readRow(`(p)=>p.cartItem.findUnique({where:{id:"${ITEM_IDLE_ID}"},select:{id:true}})`),
      readRow(`(p)=>p.cartItem.findUnique({where:{id:"${ITEM_RECENT_ID}"},select:{id:true}})`),
    ]);
    results("5a. the idle cart's CartItem cascaded away (no orphan lines)", itemIdle === null);
    results("5b. the recent cart's item SURVIVES", itemRecent !== null);

    // --- 6. the wishlist half ------------------------------------------------
    const [wishIdle, wishItemIdle] = await Promise.all([
      readRow(`(p)=>p.wishlist.findUnique({where:{token:"${WISHLIST_IDLE_TOKEN}"},select:{id:true}})`),
      readRow(`(p)=>p.wishlistItem.findUnique({where:{id:"${WISH_ITEM_IDLE_ID}"},select:{id:true}})`),
    ]);
    results("6a. the idle guest wishlist swept", wishIdle === null);
    results("6b. its WishlistItem cascaded away", wishItemIdle === null);

    // --- 7. the server is still healthy post-sweep ---------------------------
    const healthAfter = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthAfterBody = await healthAfter.text();
    results("7. health still 200 + db:true post-sweep",
      healthAfter.status === 200 && healthAfterBody.includes('"db":true'), healthAfterBody.slice(0, 80));

    // --- 8. the F-J soft-skip wiring, explicit -------------------------------
    await killChild(healthy.child);
    healthy = null;
    schemaless = await bootServer(EMPTY_DB_URL);
    // register() fires the boot sweep against the schema-less file at boot;
    // give the downgrade line a moment to land in stderr if the first health
    // 200 raced it.
    const softSkipDeadline = Date.now() + 6_000;
    let softSkipSeen = false;
    while (Date.now() < softSkipDeadline) {
      if (healthy === null && schemaless.stderrTail().includes("boot sweep skipped: database schema not ready")) {
        softSkipSeen = true;
        break;
      }
      if (schemaless.stderrTail().includes("boot sweep skipped: database schema not ready")) {
        softSkipSeen = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    const healthBroken = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBrokenBody = await healthBroken.text();
    results("8a. the schema-less spawn still boots + serves health 200",
      healthBroken.status === 200, healthBrokenBody.slice(0, 80));
    results("8b. health answers db:false (the F-OO honest degradation)",
      healthBrokenBody.includes('"db":false'), healthBrokenBody.slice(0, 80));
    results("8c. the F-J soft-skip downgrade line in the boot stderr",
      softSkipSeen, softSkipSeen ? "[sweeper] boot sweep skipped: …" : `stderr tail: ${schemaless.stderrTail().slice(0, 200)}`);

    await killChild(schemaless.child);
    schemaless = null;
  } catch (err) {
    console.error(`PROBE ERROR: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (healthy) { try { await killChild(healthy.child); } catch { /* best effort */ } }
    if (schemaless) { try { await killChild(schemaless.child); } catch { /* best effort */ } }
    try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  console.log(`\nplan-probe-session53: ${passCount} passed, ${failCount} failed`);
})();
