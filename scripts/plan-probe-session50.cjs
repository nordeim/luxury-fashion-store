#!/usr/bin/env node
// Session-50 plan-validation probe — wire-verifies the F-UU contract
// assumptions BEFORE the spec is written (the standing §6 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// cart-line actions need working DB reads + writes on the copy). Zero writes
// touch the dev DB or db/e2e.db; the throwaway copy (with the fixture rows)
// is deleted with its tmpdir.
//
// THE WIRE SHAPES (the H-59 measured JSON-arg shapes — adjustCartItemAction
// is a (itemId, delta) two-arg action, removeCartItemAction a (itemId)
// one-arg action; both ids live on the PDP route's manifest):
//   POST /product/<canonical-slug>
//   Next-Action: <id>
//   Content-Type: text/plain;charset=UTF-8
//   body: JSON ["<itemId>", <delta>]   /   JSON ["<itemId>"]
//   (authenticated variants add an EXPLICIT Cookie header — the F-RR wire
//    fact: getCurrentUser() reads it inside the action exactly as a
//    browser's automatic attach; the APIRequestContext jar is never used.)
//
// Checks (all on the wire / server-truth):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true});
//   2. the PDP route manifest exposes exactly 4 ids;
//      adjustCartItemAction + removeCartItemAction identified by
//      exportedName (the build-shape canary);
//   3. the offline-minted james session (INSERT..SELECT by email, FUTURE
//      expiry, the HMAC cookie) AUTHENTICATES: GET /account with the
//      explicit Cookie header renders SIGNED-IN (the "Sign out" surface);
//   4. the VICTIM fixture mints on the copy: an ADMIN-owned cart (the seed
//      ships NO cart rows — verified) + one line on a canonical product;
//   5. THE WALLS HOLD (the pin's standing shape): the authenticated
//      adjust-shaped [victimId, -99] and remove-shaped [victimId] crafts
//      answer "Sign in to manage this bag." + ok:false AND the victim row
//      survives byte-identical server-truth;
//   6. the auth wall stays FIRST: the same crafts cookie-less answer the
//      guest-branch envelope ("That bag line no longer exists.") — never
//      5xx, never a Set-Cookie;
//   7. the FALSE-POSITIVE GUARD (the own-id controls): james's own cart +
//      fixture lines — [ownA, +1] → ok:true + quantity 2 server-truth,
//      [ownA, -1] → restored to 1, the remove-shaped [ownB] → ok:true +
//      the row GONE (the wire shapes WRITE when the wall passes);
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
const SECRET = "session50-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const PDP_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/product/[slug]/page/server-reference-manifest.json",
);
const PDP_PATH = "/product/silk-draped-evening-gown";

// The throwaway DB: a copy of the dev DB, deleted with the probe.
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe-session50-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;

const SUFFIX = crypto.randomBytes(6).toString("hex");
const SESSION_TOKEN = `fuu-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const COOKIE = `${SESSION_TOKEN}.${crypto.createHmac("sha256", SECRET).update(SESSION_TOKEN).digest("base64url")}`;
const VICTIM_CART_ID = `fuu-vcart-${SUFFIX}`;
const VICTIM_ITEM_ID = `fuu-vitem-${SUFFIX}`;
const OWN_CART_ID = `fuu-ocart-${SUFFIX}`;
const OWN_ITEM_A = `fuu-oitema-${SUFFIX}`;
const OWN_ITEM_B = `fuu-oitemb-${SUFFIX}`;
const OWN_SIZE = `FUU-${SUFFIX.slice(0, 6)}`;

const SIGN_IN_MSG = "Sign in to manage this bag.";
const GUEST_ENVELOPE = "That bag line no longer exists.";

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

/** The H-59 JSON-arg action craft, addressed at the PDP route. Optional
 * explicit session cookie (the F-RR wire fact — never a jar). */
async function postAction(actionId, payload, cookie) {
  const res = await fetch(`${BASE}${PDP_PATH}`, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
      "Content-Type": "text/plain;charset=UTF-8",
      ...(cookie ? { Cookie: `aurelia_session=${cookie}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, body: await res.text(), setCookies };
}

function readManifest(file) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.entries(manifest.node ?? {}).map(([id, v]) => ({ id, exportedName: v.exportedName }));
}

(async function main() {
  let child = null;
  try {
    // The healthy throwaway COPY of the seeded dev DB (the F-PP/F-QQ/F-RR/
    // F-SS/F-TT copyFile pattern).
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

    // --- fixture on the COPY (before boot): james session + victim cart +
    // line + james OWN cart + two own lines. The seed ships no carts, so the
    // userId-unique INSERTs are safe; a canonical product anchors the lines.
    const product = JSON.parse(dbRead(`(p)=>p.product.findFirst({where:{isActive:true,slug:"silk-draped-evening-gown"},select:{id:true}})`));
    sqlRun(
      `DELETE FROM "CartItem" WHERE "id" IN ('${VICTIM_ITEM_ID}','${OWN_ITEM_A}','${OWN_ITEM_B}');\n` +
        `DELETE FROM "Cart" WHERE "id" IN ('${VICTIM_CART_ID}','${OWN_CART_ID}');\n` +
        `DELETE FROM "Session" WHERE "token" = '${SESSION_TOKEN}';\n` +
        `INSERT INTO "Session" ("id","token","userId","expiresAt","createdAt") ` +
        `SELECT 'fuu-sess-${SUFFIX}', '${SESSION_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") ` +
        `SELECT '${VICTIM_CART_ID}', 'fuu-vtoken-${SUFFIX}', id, datetime('now'), datetime('now') ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") ` +
        `SELECT '${OWN_CART_ID}', 'fuu-otoken-${SUFFIX}', id, datetime('now'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';\n` +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") VALUES ` +
        `('${VICTIM_ITEM_ID}','${VICTIM_CART_ID}','${product.id}','${OWN_SIZE}',2,datetime('now'),datetime('now')),\n` +
        `('${OWN_ITEM_A}','${OWN_CART_ID}','${product.id}','${OWN_SIZE}-A',1,datetime('now'),datetime('now')),\n` +
        `('${OWN_ITEM_B}','${OWN_CART_ID}','${product.id}','${OWN_SIZE}-B',3,datetime('now'),datetime('now'));`,
    );

    // 1. boot + health
    child = await bootServer(PROBE_DB_URL);
    const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBody = await health.json();
    results("1. healthy-copy server boots (health 200 + ok + db:true)",
      health.status === 200 && healthBody.ok === true && healthBody.db === true,
      JSON.stringify(healthBody));

    // 2. manifest canary
    const entries = readManifest(PDP_MANIFEST);
    const adjust = entries.filter((e) => e.exportedName === "adjustCartItemAction");
    const remove = entries.filter((e) => e.exportedName === "removeCartItemAction");
    results("2. PDP manifest: exactly 4 ids; both cart-line actions by exportedName",
      entries.length === 4 && adjust.length === 1 && remove.length === 1,
      entries.map((e) => e.exportedName).join(", "));
    const ADJUST_ID = adjust[0]?.id;
    const REMOVE_ID = remove[0]?.id;

    // 3. the offline-minted session authenticates
    const acct = await fetch(`${BASE}/account`, {
      headers: { Cookie: `aurelia_session=${COOKIE}` },
      signal: AbortSignal.timeout(15_000),
    });
    const acctHtml = await acct.text();
    results("3. the minted james session authenticates (/account renders signed-in)",
      acct.status === 200 && acctHtml.includes("Sign out"),
      `status ${acct.status}`);

    // 5. the walls hold (authenticated crafts vs the victim)
    const victimBefore = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${VICTIM_ITEM_ID}"},select:{quantity:true,size:true}})`));
    const adjDeny = await postAction(ADJUST_ID, [VICTIM_ITEM_ID, -99], COOKIE);
    const remDeny = await postAction(REMOVE_ID, [VICTIM_ITEM_ID], COOKIE);
    const victimAfterDeny = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${VICTIM_ITEM_ID}"},select:{quantity:true,size:true}})`));
    results("5a. authenticated adjust craft answers the ownership envelope",
      adjDeny.status === 200 && adjDeny.body.includes(SIGN_IN_MSG) && adjDeny.body.includes('"ok":false'),
      adjDeny.body.slice(0, 120));
    results("5b. authenticated remove craft answers the ownership envelope",
      remDeny.status === 200 && remDeny.body.includes(SIGN_IN_MSG) && remDeny.body.includes('"ok":false'),
      remDeny.body.slice(0, 120));
    results("5c. the victim row survives both crafts byte-identical",
      victimBefore && victimAfterDeny && victimBefore.quantity === victimAfterDeny.quantity
        && victimBefore.quantity === 2 && victimBefore.size === victimAfterDeny.size,
      `before=${JSON.stringify(victimBefore)} after=${JSON.stringify(victimAfterDeny)}`);

    // 6. the auth wall stays first (cookie-less crafts → guest-branch envelope)
    const adjAnon = await postAction(ADJUST_ID, [VICTIM_ITEM_ID, -99]);
    const remAnon = await postAction(REMOVE_ID, [VICTIM_ITEM_ID]);
    const victimAfterAnon = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${VICTIM_ITEM_ID}"},select:{quantity:true}})`));
    results("6. cookie-less crafts answer the guest-branch envelope; victim untouched",
      adjAnon.status === 200 && adjAnon.body.includes(GUEST_ENVELOPE)
        && remAnon.status === 200 && remAnon.body.includes(GUEST_ENVELOPE)
        && adjAnon.setCookies.length === 0 && remAnon.setCookies.length === 0
        && victimAfterAnon && victimAfterAnon.quantity === 2,
      `adjust=${adjAnon.body.slice(0, 60)} remove=${remAnon.body.slice(0, 60)}`);

    // 7. the false-positive guard (own-id controls)
    const ownUp = await postAction(ADJUST_ID, [OWN_ITEM_A, 1], COOKIE);
    const ownAfterUp = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${OWN_ITEM_A}"},select:{quantity:true}})`));
    const ownDown = await postAction(ADJUST_ID, [OWN_ITEM_A, -1], COOKIE);
    const ownAfterDown = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${OWN_ITEM_A}"},select:{quantity:true}})`));
    const ownRem = await postAction(REMOVE_ID, [OWN_ITEM_B], COOKIE);
    const ownAfterRem = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${OWN_ITEM_B}"},select:{id:true}})`));
    results("7a. own adjust +1 writes (ok:true + quantity 2 server-truth), -1 restores",
      ownUp.body.includes('"ok":true') && ownAfterUp.quantity === 2
        && ownDown.body.includes('"ok":true') && ownAfterDown.quantity === 1,
      `up=${ownUp.body.slice(0, 60)} down=${ownDown.body.slice(0, 60)}`);
    results("7b. own remove craft writes (ok:true + row GONE server-truth)",
      ownRem.body.includes('"ok":true') && ownAfterRem === null,
      ownRem.body.slice(0, 60));

    // final zero-delta on the victim
    const victimFinal = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${VICTIM_ITEM_ID}"},select:{quantity:true,size:true}})`));
    results("8. final zero-delta on the victim row",
      victimFinal && victimFinal.quantity === 2 && victimFinal.size === victimBefore.size,
      JSON.stringify(victimFinal));
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
    console.log(`${tmpGone ? "PASS" : "FAIL"}  cleanup (tmpdir gone; dev/e2e DBs untouched by construction)`);
    if (!tmpGone) process.exitCode = 1; else passCount++;
    console.log(`\nprobe summary: ${passCount} passed, ${failCount} failed`);
  }
})();
