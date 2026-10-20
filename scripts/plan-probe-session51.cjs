#!/usr/bin/env node
// Session-51 plan-validation probe — wire-verifies the F-VV contract
// assumptions BEFORE the spec is written (the standing §4 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// auth actions + the merge need working DB reads AND writes on the copy).
// Zero writes touch the dev DB or db/e2e.db; the throwaway copy (with the
// fixture rows) is deleted with its tmpdir.
//
// THE WIRE SHAPES:
//   The auth doors over the no-JS progressive-enhancement path (the F-PP
//   measured multipart shape — a browser without JS invokes the action
//   server-side exactly this way):
//   POST /login (or /register), FormData:
//     $ACTION_REF_1 = ""
//     $ACTION_1:0   = JSON {"id":"<hex>","bound":"$@1"}
//     $ACTION_1:1   = "[null]"
//     $ACTION_KEY   = <unique>
//     + the form's own fields (email/password[/name/confirmPassword])
//   The guest cart rides an EXPLICIT Cookie header (aurelia_cart=<token>) —
//   the F-RR/F-UU wire fact; the APIRequestContext jar is never used.
//
// Checks (all on the wire / server-truth):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true});
//   2. the login + register page manifests expose exactly 2 ids each (the
//      shared auth-form pair); the login id DISCRIMINATED by envelope (the
//      F-PP method: the unknown-email login shape answers the
//      anti-enumeration envelope; the sibling fails registerSchema's Zod
//      gate), the register id by the exists envelope on the register page;
//   3. the fixture user mints with an OFFLINE scrypt hash (s1$salt$hex,
//      keylen 64 — the F-II replication) and the hash VERIFIES offline;
//   4. the fixture state mints on the copy: the user's cart with the two
//      pre-existing overlap lines (A: overcoat-S qty 2 user-larger; B:
//      turtleneck-M qty 1, guest will carry 3) + the guest cart (userId
//      NULL, run-unique token) with the 4 lines (A qty 1, B qty 3, the
//      clamp line qty stock+5, the survival line qty 1);
//   5. THE LOGIN-DOOR MERGE HOLDS THE STANDING CONTRACT: the no-JS login
//      craft carrying the guest cookie SUCCEEDS (no anti-enumeration
//      envelope + a session row mints server-truth) AND the merged state
//      reads server-truth — A exactly 1 row at quantity 2 (the max union,
//      user-larger), B exactly 1 row at quantity 3 (the max union,
//      guest-larger), the clamp line at the captured stock (F-13), the
//      survival line present, the guest cart row GONE, the cart cookie
//      CLEARED on the wire (a Set-Cookie carrying aurelia_cart);
//   6. THE REGISTER-DOOR MERGE HOLDS: a fresh-email no-JS register craft
//      carrying a fresh guest cookie mints the user + the user cart (the
//      merge upsert), the clamp line clamped, the survival line present,
//      the guest cart row GONE;
//   7. the false-positive shape: the SAME fixture user logging in with NO
//      cart cookie still succeeds (the merge no-ops on the early return);
//   8. kill → cleanup confirmed (the tmpdir gone, the dev/e2e DBs
//      untouched).
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session51-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const LOGIN_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(auth)/login/page/server-reference-manifest.json",
);
const REGISTER_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(auth)/register/page/server-reference-manifest.json",
);

// The throwaway DB: a copy of the dev DB, deleted with the probe.
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe-session51-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;

const SUFFIX = crypto.randomBytes(6).toString("hex");
const FIXTURE_EMAIL = `fvv-${SUFFIX}@example.com`;
const FIXTURE_PASS = "FvvGate1234!";
const REG_EMAIL = `fvv-reg-${SUFFIX}@example.com`;
const USER_CART_ID = `fvv-ucart-${SUFFIX}`;
const GUEST_CART_1 = `fvv-gcart1-${SUFFIX}`;
const GUEST_CART_2 = `fvv-gcart2-${SUFFIX}`;
const GUEST_TOKEN_1 = `fvv-gtoken1-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const GUEST_TOKEN_2 = `fvv-gtoken2-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const UA = `fvv-ua-${SUFFIX}`;   // user's overlap-A line (overcoat-S, qty 2)
const UB = `fvv-ub-${SUFFIX}`;   // user's overlap-B line (turtleneck-M, qty 1)
const GA = `fvv-ga-${SUFFIX}`;   // guest overlap-A (qty 1)
const GB = `fvv-gb-${SUFFIX}`;   // guest overlap-B (qty 3)
const GC = `fvv-gc-${SUFFIX}`;   // guest clamp line (qty stock+5)
const GS = `fvv-gs-${SUFFIX}`;   // guest survival line (qty 1)
const G2C = `fvv-g2c-${SUFFIX}`; // register-door guest clamp line
const G2S = `fvv-g2s-${SUFFIX}`; // register-door guest survival line

const ENUMERATION_MSG = "Incorrect email or password.";
const ZOD_COPY = "Check the highlighted fields";

let passCount = 0;
let failCount = 0;
function results(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (ok) passCount++;
  else { failCount++; process.exitCode = 1; }
}

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
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const deadline = Date.now() + 25_000;
  return new Promise((resolve, reject) => {
    (async function poll() {
      if (Date.now() > deadline) {
        child.kill("SIGKILL");
        reject(new Error(`server never listened — stderr: ${stderr.slice(0, 400)}`));
        return;
      }
      try {
        const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) { resolve(child); return; }
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
  return res.stdout.slice(marker + "<<JSON>>".length).trim();
}

/** The no-JS progressive-enhancement POST (the F-PP measured shape). */
async function postForm(pagePath, actionId, fields, cookie) {
  const fd = new FormData();
  fd.set("$ACTION_REF_1", "");
  fd.set("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
  fd.set("$ACTION_1:1", "[null]");
  fd.set("$ACTION_KEY", `kfvv${process.pid.toString(16)}${Date.now().toString(16)}`);
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const res = await fetch(`${BASE}${pagePath}`, {
    method: "POST",
    body: fd,
    headers: cookie ? { Cookie: `aurelia_cart=${cookie}` } : {},
    signal: AbortSignal.timeout(20_000),
    redirect: "manual",
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, body: await res.text(), setCookies };
}

function manifestIds(file) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.keys(manifest.node ?? {});
}

(async function main() {
  let child = null;
  try {
    // The healthy throwaway COPY of the seeded dev DB (the F-PP/F-QQ/F-RR/
    // F-SS/F-TT/F-UU copyFile pattern).
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

    // --- the fixture products (runtime-resolved; stocks captured at runtime)
    const overcoat = JSON.parse(dbRead(`(p)=>p.product.findFirst({where:{slug:"cashmere-overcoat"},select:{id:true,stock:true}})`));
    const turtleneck = JSON.parse(dbRead(`(p)=>p.product.findFirst({where:{slug:"merino-wool-turtleneck"},select:{id:true,stock:true}})`));
    const tote = JSON.parse(dbRead(`(p)=>p.product.findFirst({where:{slug:"structured-tote-bag"},select:{id:true,stock:true}})`));
    if (!overcoat || !turtleneck || !tote) throw new Error("fixture products missing from the copy");
    const CLAMP_QTY = tote.stock + 5;

    // --- the fixture user (offline scrypt, the F-II replication) + the
    // user's cart + the two pre-existing overlap lines; the guest carts.
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(FIXTURE_PASS, salt, 64).toString("hex");
    const passwordHash = `s1$${salt}$${hash}`;
    sqlRun(
      `DELETE FROM "CartItem" WHERE "id" LIKE 'fvv-%-${SUFFIX}';\n` +
        `DELETE FROM "Cart" WHERE "id" LIKE 'fvv-%-${SUFFIX}';\n` +
        `DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE email IN ('${FIXTURE_EMAIL}','${REG_EMAIL}'));\n` +
        `DELETE FROM "User" WHERE email IN ('${FIXTURE_EMAIL}','${REG_EMAIL}');\n` +
        `INSERT INTO "User" ("id","email","passwordHash","name","role","createdAt","updatedAt") VALUES ` +
        `('fvv-user-${SUFFIX}','${FIXTURE_EMAIL}','${passwordHash}','FVV Probe','user',datetime('now'),datetime('now'));\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") VALUES ` +
        `('${USER_CART_ID}','fvv-utoken-${SUFFIX}','fvv-user-${SUFFIX}',datetime('now'),datetime('now')),\n` +
        `('${GUEST_CART_1}','${GUEST_TOKEN_1}',NULL,datetime('now'),datetime('now')),\n` +
        `('${GUEST_CART_2}','${GUEST_TOKEN_2}',NULL,datetime('now'),datetime('now'));\n` +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") VALUES ` +
        `('${UA}','${USER_CART_ID}','${overcoat.id}','S',2,datetime('now'),datetime('now')),\n` +
        `('${UB}','${USER_CART_ID}','${turtleneck.id}','M',1,datetime('now'),datetime('now')),\n` +
        `('${GA}','${GUEST_CART_1}','${overcoat.id}','S',1,datetime('now'),datetime('now')),\n` +
        `('${GB}','${GUEST_CART_1}','${turtleneck.id}','M',3,datetime('now'),datetime('now')),\n` +
        `('${GC}','${GUEST_CART_1}','${tote.id}','One Size',${CLAMP_QTY},datetime('now'),datetime('now')),\n` +
        `('${GS}','${GUEST_CART_1}','${turtleneck.id}','L',1,datetime('now'),datetime('now')),\n` +
        `('${G2C}','${GUEST_CART_2}','${tote.id}','One Size',${CLAMP_QTY},datetime('now'),datetime('now')),\n` +
        `('${G2S}','${GUEST_CART_2}','${turtleneck.id}','L',1,datetime('now'),datetime('now'));`,
    );

    // 3a. the offline scrypt hash verifies (the F-II replication, on the copy)
    const verifies = JSON.parse(dbRead(`(p)=>{const parts=${JSON.stringify(passwordHash)}.split("$");const expected=Buffer.from(parts[2],"hex");const actual=require("node:crypto").scryptSync(${JSON.stringify(FIXTURE_PASS)},parts[1],expected.length);return p.user.count({where:{email:"${FIXTURE_EMAIL}"}}).then(c=>c===1&&expected.length===actual.length&&require("node:crypto").timingSafeEqual(expected,actual))}`));
    results("3. the fixture user mints + the offline scrypt hash verifies",
      verifies === true, `email=${FIXTURE_EMAIL}`);

    // 1. boot + health
    child = await bootServer(PROBE_DB_URL);
    const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBody = await health.json();
    results("1. healthy-copy server boots (health 200 + ok + db:true)",
      health.status === 200 && healthBody.ok === true && healthBody.db === true,
      JSON.stringify(healthBody));

    // 2. the manifest canaries + the login id discrimination (F-PP's method)
    const loginIds = manifestIds(LOGIN_MANIFEST);
    const regIds = manifestIds(REGISTER_MANIFEST);
    results("2a. the login + register manifests expose exactly 2 ids (identical pair)",
      loginIds.length === 2 && regIds.length === 2 && loginIds.join() === regIds.join(),
      loginIds.join(", "));
    let LOGIN_ID = null;
    let REGISTER_ID = null;
    for (const id of loginIds) {
      const r = await postForm("/login", id, { email: `fvv-unknown-${SUFFIX}@example.com`, password: "WrongPassword1234!" });
      if (r.body.includes(ENUMERATION_MSG)) LOGIN_ID = id;
      else if (r.body.includes(ZOD_COPY)) REGISTER_ID = id;
    }
    results("2b. the login id discriminated by the anti-enumeration envelope",
      LOGIN_ID !== null && REGISTER_ID !== null && LOGIN_ID !== REGISTER_ID,
      `login=${LOGIN_ID?.slice(0, 8)} register=${REGISTER_ID?.slice(0, 8)}`);

    // 5. THE LOGIN-DOOR MERGE — the standing contract
    const loginRes = await postForm("/login", LOGIN_ID, { email: FIXTURE_EMAIL, password: FIXTURE_PASS }, GUEST_TOKEN_1);
    const sessionRow = JSON.parse(dbRead(`(p)=>p.session.count({where:{user:{email:"${FIXTURE_EMAIL}"}}})`));
    const loginOk = loginRes.status < 400 && !loginRes.body.includes(ENUMERATION_MSG) && sessionRow >= 1;
    results("5a. the no-JS login craft carrying the guest cookie succeeds (no envelope + session row)",
      loginOk, `status=${loginRes.status} sessions=${sessionRow}`);

    const mergedA = JSON.parse(dbRead(`(p)=>p.cartItem.findMany({where:{cart:{id:"${USER_CART_ID}"},product:{slug:"cashmere-overcoat"},size:"S"},select:{quantity:true}})`));
    const mergedB = JSON.parse(dbRead(`(p)=>p.cartItem.findMany({where:{cart:{id:"${USER_CART_ID}"},product:{slug:"merino-wool-turtleneck"},size:"M"},select:{quantity:true}})`));
    const mergedClamp = JSON.parse(dbRead(`(p)=>p.cartItem.findMany({where:{cart:{id:"${USER_CART_ID}"},product:{slug:"structured-tote-bag"},size:"One Size"},select:{quantity:true}})`));
    const mergedSurvival = JSON.parse(dbRead(`(p)=>p.cartItem.findMany({where:{cart:{id:"${USER_CART_ID}"},product:{slug:"merino-wool-turtleneck"},size:"L"},select:{quantity:true}})`));
    const guest1Gone = JSON.parse(dbRead(`(p)=>p.cart.findUnique({where:{id:"${GUEST_CART_1}"},select:{id:true}})`)) === null;
    results("5b. overlap-A merged: exactly 1 row at the MAX quantity 2 (user-larger union)",
      mergedA.length === 1 && mergedA[0].quantity === 2, JSON.stringify(mergedA));
    results("5c. overlap-B merged: exactly 1 row at the MAX quantity 3 (guest-larger union)",
      mergedB.length === 1 && mergedB[0].quantity === 3, JSON.stringify(mergedB));
    results("5d. the clamp line clamped to the captured stock (F-13)",
      mergedClamp.length === 1 && mergedClamp[0].quantity === tote.stock,
      `expected=${tote.stock} got=${JSON.stringify(mergedClamp)}`);
    results("5e. the survival line lands",
      mergedSurvival.length === 1 && mergedSurvival[0].quantity === 1, JSON.stringify(mergedSurvival));
    results("5f. the guest cart row is GONE (merged + deleted)",
      guest1Gone, `guest1=${GUEST_CART_1}`);
    const cartCleared = loginRes.setCookies.some((c) => c.includes("aurelia_cart="));
    results("5g. the cart cookie CLEARED on the wire (a Set-Cookie carries aurelia_cart)",
      cartCleared, loginRes.setCookies.map((c) => c.split(";")[0]).join(" | "));

    // 6. THE REGISTER-DOOR MERGE — the standing contract
    const regRes = await postForm("/register", REGISTER_ID, {
      email: REG_EMAIL, name: "FVV Reg", password: FIXTURE_PASS, confirmPassword: FIXTURE_PASS,
    }, GUEST_TOKEN_2);
    const regUser = JSON.parse(dbRead(`(p)=>p.user.findUnique({where:{email:"${REG_EMAIL}"},select:{id:true}})`));
    const regCart = regUser ? JSON.parse(dbRead(`(p)=>p.cart.findUnique({where:{userId:"${regUser.id}"},select:{id:true,items:{select:{quantity:true,product:{select:{slug:true}},size:true}}}})`)) : null;
    const regClamp = regCart?.items?.filter((i) => i.product.slug === "structured-tote-bag");
    const regSurvival = regCart?.items?.filter((i) => i.product.slug === "merino-wool-turtleneck" && i.size === "L");
    const guest2Gone = JSON.parse(dbRead(`(p)=>p.cart.findUnique({where:{id:"${GUEST_CART_2}"},select:{id:true}})`)) === null;
    results("6a. the register craft mints the user + the merge upserts the user cart",
      regRes.status < 400 && !!regUser && !!regCart && regCart.items.length === 2,
      `status=${regRes.status} items=${regCart?.items?.length}`);
    results("6b. the register door's clamp line clamped to stock",
      regClamp?.length === 1 && regClamp[0].quantity === tote.stock, JSON.stringify(regClamp));
    results("6c. the register door's survival line lands; the guest row GONE",
      regSurvival?.length === 1 && regSurvival[0].quantity === 1 && guest2Gone,
      `survival=${JSON.stringify(regSurvival)} guest2Gone=${guest2Gone}`);

    // 7. the false-positive shape: no cart cookie → the login still succeeds (merge no-ops)
    const plainLogin = await postForm("/login", LOGIN_ID, { email: FIXTURE_EMAIL, password: FIXTURE_PASS });
    const userLineCount = JSON.parse(dbRead(`(p)=>p.cartItem.count({where:{cart:{id:"${USER_CART_ID}"}}})`));
    results("7. a cookie-less login still succeeds and the merge no-ops (4 merged lines, unchanged)",
      plainLogin.status < 400 && !plainLogin.body.includes(ENUMERATION_MSG) && userLineCount === 4,
      `status=${plainLogin.status} lines=${userLineCount}`);
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await new Promise((r) => { child.once("exit", r); setTimeout(r, 3000); });
    }
    try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* tmp already gone */ }
    const tmpGone = !fs.existsSync(TMPDIR);
    console.log(`${tmpGone ? "PASS" : "FAIL"}  8. cleanup (tmpdir gone; dev/e2e DBs untouched by construction)`);
    if (!tmpGone) process.exitCode = 1; else passCount++;
    console.log(`\nprobe summary: ${passCount} passed, ${failCount} failed`);
  }
})();
