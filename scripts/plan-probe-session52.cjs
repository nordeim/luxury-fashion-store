#!/usr/bin/env node
// Session-52 plan-validation probe — wire-verifies the F-WW contract
// assumptions BEFORE the specs are written (the standing §4 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// add + checkout actions need working DB reads AND writes on the copy).
// Zero writes touch the dev DB or db/e2e.db; the throwaway copy (with the
// fixture rows) is deleted with its tmpdir.
//
// THE WIRE SHAPES:
//   addToCartAction — the action-seam census's JSON-arg shape on PLAIN Node
//   fetch (cookie-less): POST /product/<slug>, headers Next-Action +
//   Content-Type text/plain;charset=UTF-8, body JSON [productId, size, qty].
//   Plain fetch attaches nothing — the F-UU/F-VV wire fact (Playwright
//   request contexts ride storageState; the APIRequestContext jar drops the
//   production-Secure cookie over http).
//   placeOrderAction — the F-QQ measured fetch-action multipart shape:
//   POST /checkout, headers Next-Action (+ Cookie: aurelia_cart=<token>),
//   FormData where the `_1_*` form fields PRECEDE the flight row "0" =
//   [null,"$K1"] (the server's ordered referencedEntries walk breaks at the
//   first non-matching key).
//
// Checks (all on the wire / server-truth):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true});
//   2. the PDP route manifest exposes exactly 4 ids; addToCartAction
//      discriminated by exportedName + filename;
//   3. THE DEACTIVATED FIXTURE CRAFT: the cookie-less JSON-arg craft answers
//      "This piece is no longer available." + ok:false + NO Set-Cookie (the
//      wall fires BEFORE getOrCreateCart) + ZERO CartItem rows server-truth;
//   4. THE CLAMP CRAFT: the 99-quantity craft (the Zod max) vs the fixture's
//      captured stock S answers ok:true + a minted aurelia_cart Set-Cookie +
//      exactly ONE CartItem row at quantity EXACTLY S server-truth + the
//      response DTO carrying the clamped quantity;
//   5. the checkout route manifest exposes exactly 3 ids; placeOrderAction
//      discriminated by exportedName + filename;
//   6. THE OVER-STOCK BAG CRAFT: the multipart craft riding an explicit
//      aurelia_cart cookie on a SQL-minted guest cart (line qty 99 vs stock
//      S) answers "A piece in your bag just sold out. Please review your
//      bag." + ok:false + order count UNCHANGED + stock UNCHANGED + the bag
//      line INTACT (the rollback's no-purge half);
//   7. THE DEACTIVATED-BAG CRAFT: the same shape on a cart whose line sits
//      on the deactivated product at a lawful qty 1 answers the same
//      envelope + order count UNCHANGED + stock UNCHANGED + line intact;
//   8. cleanup confirmed (the child killed, the tmpdir gone).
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session52-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const PDP_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/product/[slug]/page/server-reference-manifest.json",
);
const CHECKOUT_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/checkout/page/server-reference-manifest.json",
);

// The throwaway DB: a copy of the dev DB, deleted with the probe.
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe-session52-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;

const SUFFIX = crypto.randomBytes(6).toString("hex");
const INACTIVE_SLUG = `fww-${SUFFIX}-inactive`;
const CLAMP_SLUG = `fww-${SUFFIX}-clamp`;
const CART_A_TOKEN = `fww-ta-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const CART_B_TOKEN = `fww-tb-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const STOCK = 5; // the fixture stock (S) — captured back at runtime regardless

const NOT_FOUND_MSG = "This piece is no longer available.";
const SOLD_OUT_MSG = "A piece in your bag just sold out. Please review your bag.";

const COD_PAYLOAD = {
  email: `fww-probe-${process.pid}@example.com`,
  fullName: "FWW Probe",
  street: "1 Probe Lane",
  city: "Probe City",
  state: "Probe State",
  zip: "12345",
  country: "United States",
  paymentMethod: "cod",
};

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

/** The census's JSON-arg craft on PLAIN Node fetch (cookie-less by default). */
async function postJsonAction(pagePath, actionId, payload, cookie) {
  const headers = { "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8" };
  if (cookie) headers.Cookie = `aurelia_cart=${cookie}`;
  const res = await fetch(`${BASE}${pagePath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
    redirect: "manual",
  });
  return { status: res.status, body: await res.text(), setCookies: res.headers.getSetCookie?.() ?? [] };
}

/** The F-QQ measured fetch-action multipart shape (with the explicit cart cookie). */
async function postCheckoutAction(actionId, fields, cookie) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(`_1_${k}`, v);
  fd.set("0", '[null,"$K1"]');
  const res = await fetch(`${BASE}/checkout`, {
    method: "POST",
    headers: { "Next-Action": actionId, Cookie: `aurelia_cart=${cookie}` },
    body: fd,
    signal: AbortSignal.timeout(20_000),
    redirect: "manual",
  });
  return { status: res.status, body: await res.text(), setCookies: res.headers.getSetCookie?.() ?? [] };
}

/** manifest entries as { id, exportedName, filename } — the F-UU/F-QQ canary shape. */
function manifestEntries(file) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.entries(manifest.node ?? {}).map(([id, v]) => ({
    id,
    exportedName: v?.exportedName,
    filename: v?.filename,
  }));
}

(async function main() {
  let child = null;
  try {
    // The healthy throwaway COPY of the seeded dev DB (the F-PP/F-QQ/F-RR/
    // F-SS/F-TT/F-UU/F-VV copyFile pattern).
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

    // --- the fixture products (F-LL's INSERT shape: categoryId by scalar
    // subquery, sizes '[]' so sizeAllowed stays unconstrained per its
    // documented empty-list rule) + the two guest carts with their lines.
    const row = (slug, isActive) =>
      `INSERT INTO "Product" ("id","slug","name","brand","description","price","categoryId","subcategory","sortOrder","stock","isActive","createdAt","updatedAt") ` +
      `VALUES ('${slug}','${slug}','FWW Probe ${slug}','E2E','F-WW fixture row',100,` +
      `(SELECT "id" FROM "Category" WHERE "slug"='accessories' LIMIT 1),'hats',2001,${STOCK},${isActive ? 1 : 0},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`;
    const cartRow = (id, token) =>
      `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") VALUES ('${id}','${token}',NULL,datetime('now'),datetime('now'));`;
    sqlRun(
      `DELETE FROM "CartItem" WHERE "id" LIKE 'fww-%-${SUFFIX}';\n` +
        `DELETE FROM "Cart" WHERE "token" IN ('${CART_A_TOKEN}','${CART_B_TOKEN}');\n` +
        `DELETE FROM "Product" WHERE "slug" IN ('${INACTIVE_SLUG}','${CLAMP_SLUG}');\n` +
        row(INACTIVE_SLUG, false) + "\n" +
        row(CLAMP_SLUG, true) + "\n" +
        cartRow(`fww-ca-${SUFFIX}`, CART_A_TOKEN) + "\n" +
        cartRow(`fww-cb-${SUFFIX}`, CART_B_TOKEN) + "\n" +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") ` +
        `VALUES ('fww-ia-${SUFFIX}','fww-ca-${SUFFIX}',(SELECT "id" FROM "Product" WHERE "slug"='${CLAMP_SLUG}'),'M',${99},datetime('now'),datetime('now'));\n` +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") ` +
        `VALUES ('fww-ib-${SUFFIX}','fww-cb-${SUFFIX}',(SELECT "id" FROM "Product" WHERE "slug"='${INACTIVE_SLUG}'),'M',1,datetime('now'),datetime('now'));\n`,
    );

    const inactiveId = JSON.parse(dbRead(`(p)=>p.product.findUnique({where:{slug:"${INACTIVE_SLUG}"},select:{id:true,stock:true,isActive:true}})`));
    const clampProd = JSON.parse(dbRead(`(p)=>p.product.findUnique({where:{slug:"${CLAMP_SLUG}"},select:{id:true,stock:true,isActive:true}})`));
    if (!inactiveId?.id || !clampProd?.id) throw new Error("fixture products missing after mint");
    const S = clampProd.stock; // captured at runtime — never hardcoded
    const ordersBefore = Number(dbRead(`(p)=>p.order.count()`));
    // The fixture's OWN Cart B line sits on the inactive product (qty 1) and
    // Cart A's on the clamp product (qty 99) — the craft-write assertions
    // must read the DELTA against these baselines, never absolute counts.
    const inactiveRowsBefore = Number(dbRead(`(p)=>p.cartItem.count({where:{productId:"${inactiveId.id}"}})`));
    const clampRowsBefore = Number(dbRead(`(p)=>p.cartItem.count({where:{productId:"${clampProd.id}"}})`));

    // --- 1. boot + health ------------------------------------------------
    child = await bootServer(PROBE_DB_URL);
    const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBody = await health.text();
    results("1. throwaway boots + health", health.status === 200 && healthBody.includes('"db":true'), healthBody.slice(0, 80));

    // --- 2. PDP manifest canary + addToCartAction by exportedName --------
    const pdp = manifestEntries(PDP_MANIFEST);
    const add = pdp.filter((e) => e.exportedName === "addToCartAction" && e.filename === "src/lib/actions/cart.ts");
    results("2a. PDP manifest exposes exactly 4 ids", pdp.length === 4, `got ${pdp.length}`);
    results("2b. exactly one addToCartAction on the PDP route", add.length === 1, add.map((e) => e.id.slice(0, 8)).join(","));
    const addActionId = add[0]?.id;
    if (!addActionId) throw new Error("addToCartAction not found — cannot continue");

    // --- 3. the deactivated fixture craft (the isActive wall) ------------
    const wallCraft = await postJsonAction(`/product/${CLAMP_SLUG}`, addActionId, [inactiveId.id, "M", 1]);
    const noCookieMinted = !wallCraft.setCookies.some((c) => c.startsWith("aurelia_cart="));
    const wallRows = Number(dbRead(`(p)=>p.cartItem.count({where:{productId:"${inactiveId.id}"}})`));
    results(
      "3. deactivated craft answers the availability envelope + ZERO NEW rows + no Set-Cookie",
      wallCraft.status === 200 &&
        wallCraft.body.includes(NOT_FOUND_MSG) &&
        wallCraft.body.includes('"ok":false') &&
        noCookieMinted &&
        wallRows === inactiveRowsBefore,
      `status=${wallCraft.status} rows=${wallRows}/${inactiveRowsBefore} cookie=${noCookieMinted}`,
    );

    // --- 4. the clamp craft (quantity 99 vs captured stock S) ------------
    const clampCraft = await postJsonAction(`/product/${CLAMP_SLUG}`, addActionId, [clampProd.id, "M", 99]);
    const clampCookie = clampCraft.setCookies.find((c) => c.startsWith("aurelia_cart="));
    const clampToken = clampCookie ? clampCookie.match(/aurelia_cart=([^;]+)/)?.[1] : null;
    // Read THE CRAFT'S OWN LINE — the cart minted by this craft's cookie
    // (Cart A's fixture line also sits on the clamp product; findFirst
    // without the cartId filter matched it in the first probe run).
    const clampLine = JSON.parse(
      dbRead(
        `(p)=>p.cartItem.findFirst({where:{productId:"${clampProd.id}",cart:{token:"${clampToken}"}},select:{quantity:true}})`,
      ),
    );
    results(
      "4a. the 99-craft answers ok:true + mints the guest cart cookie",
      clampCraft.status === 200 && clampCraft.body.includes('"ok":true') && Boolean(clampToken),
      `status=${clampCraft.status} cookie=${clampCookie ? "minted" : "absent"}`,
    );
    results(
      "4b. the line lands CLAMPED at exactly the captured stock (F-13's add-path sibling)",
      clampLine?.quantity === S,
      `quantity=${clampLine?.quantity} expected=${S}`,
    );
    results(
      "4c. the response DTO carries the clamped quantity (the client store re-syncs from it)",
      clampCraft.body.includes(`"quantity":${S}`),
      `body-has-qty-${S}=${clampCraft.body.includes(`"quantity":${S}`)}`,
    );

    // --- 5. checkout manifest canary + placeOrderAction by exportedName --
    const co = manifestEntries(CHECKOUT_MANIFEST);
    const place = co.filter((e) => e.exportedName === "placeOrderAction" && e.filename === "src/lib/actions/checkout.ts");
    results("5a. checkout manifest exposes exactly 3 ids", co.length === 3, `got ${co.length}`);
    results("5b. exactly one placeOrderAction on the checkout route", place.length === 1);
    const placeId = place[0]?.id;
    if (!placeId) throw new Error("placeOrderAction not found — cannot continue");

    // --- 6. the over-stock bag craft (STOCK_SHORT's stock term) ----------
    const stockBefore = Number(dbRead(`(p)=>p.product.findUnique({where:{id:"${clampProd.id}"},select:{stock:true}})`).match(/"stock":(\d+)/)?.[1] ?? -1);
    const craftA = await postCheckoutAction(placeId, COD_PAYLOAD, CART_A_TOKEN);
    const ordersAfterA = Number(dbRead(`(p)=>p.order.count()`));
    const stockAfterA = Number(dbRead(`(p)=>p.product.findUnique({where:{id:"${clampProd.id}"},select:{stock:true}})`).match(/"stock":(\d+)/)?.[1] ?? -1);
    const lineA = JSON.parse(dbRead(`(p)=>p.cartItem.findFirst({where:{id:"fww-ia-${SUFFIX}"},select:{quantity:true}})`));
    results(
      "6a. the over-stock bag answers the sold-out envelope + ok:false",
      craftA.status === 200 && craftA.body.includes(SOLD_OUT_MSG) && craftA.body.includes('"ok":false'),
      `status=${craftA.status}`,
    );
    results(
      "6b. the rollback held: zero orders, stock unchanged, bag line intact",
      ordersAfterA === ordersBefore && stockAfterA === stockBefore && lineA?.quantity === 99,
      `orders=${ordersAfterA}/${ordersBefore} stock=${stockAfterA}/${stockBefore} lineQty=${lineA?.quantity}`,
    );

    // --- 7. the deactivated-bag craft (STOCK_SHORT's isActive term) ------
    const craftB = await postCheckoutAction(placeId, COD_PAYLOAD, CART_B_TOKEN);
    const ordersAfterB = Number(dbRead(`(p)=>p.order.count()`));
    const inactiveStockAfter = Number(dbRead(`(p)=>p.product.findUnique({where:{id:"${inactiveId.id}"},select:{stock:true}})`).match(/"stock":(\d+)/)?.[1] ?? -1);
    const lineB = JSON.parse(dbRead(`(p)=>p.cartItem.findFirst({where:{id:"fww-ib-${SUFFIX}"},select:{quantity:true}})`));
    results(
      "7. the deactivated-bag answers the same envelope + zero orders + stock unchanged + line intact",
      craftB.status === 200 &&
        craftB.body.includes(SOLD_OUT_MSG) &&
        craftB.body.includes('"ok":false') &&
        ordersAfterB === ordersBefore &&
        inactiveStockAfter === STOCK &&
        lineB?.quantity === 1,
      `status=${craftB.status} orders=${ordersAfterB}/${ordersBefore} stock=${inactiveStockAfter} lineQty=${lineB?.quantity}`,
    );

    // --- 8. cleanup -------------------------------------------------------
    if (child) {
      child.kill("SIGTERM");
      await new Promise((resolve) => { child.on("exit", resolve); setTimeout(resolve, 3000); });
      child.kill("SIGKILL");
    }
    child = null;
    fs.rmSync(TMPDIR, { recursive: true, force: true });
    results("8. cleanup (child killed, tmpdir gone)", !fs.existsSync(TMPDIR));
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    process.exitCode = 1;
    if (child) {
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
      try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }
  console.log(`\n${passCount} passed, ${failCount} failed`);
})();
