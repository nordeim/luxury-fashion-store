#!/usr/bin/env node
// Session-48 plan-validation probe — wire-verifies the F-SS contract
// assumptions BEFORE the spec is written (the standing §5 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// admin actions need working DB reads — getCurrentUser must resolve BOTH
// minted session rows and their roles; findUnique must find the canonical
// product/order rows). No TRUST_PROXY needed (the admin actions carry no
// limiter — verified first-hand). Zero writes touch the dev DB or db/e2e.db;
// the throwaway copy (with both mint rows + the control write, restored
// before the copy dies) is deleted with its tmpdir.
//
// THE WIRE SHAPES (both F-QQ multipart — the two admin actions are
// `(_prev, formData)` useActionState forms):
//   POST /admin/products   (adminUpdateProductAction)
//   POST /admin/orders     (adminUpdateOrderAction)
//   Next-Action: <id>
//   multipart: _1_<field>…                 (the F-QQ ORDER rule: the
//              _1_* fields MUST precede the flight row "0")
//   multipart field "0" = [null,"$K1"]     (the fetch-action dispatch)
//   Authentication rides an explicit Cookie header (the F-RR wire fact):
//     aurelia_session=<token>.<hmac-sha256-base64url(token, AUTH_SECRET)>
//
// Checks (all on the wire / server-truth):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true});
//   2. BOTH admin route manifests expose exactly 3 ids; the two admin
//      actions identified by exportedName (the build-shape canary);
//   3. THE ROLE WALL's unauthenticated half: cookie-less crafted POSTs to
//      both actions answer "Admin access required." (200 envelopes);
//   4. LB1 (the role walls): the minted JAMES session crafts a hostile
//      product update (a real product id + stock=1) and a hostile order
//      update (a real order id + status="delivered") — each answers
//      "Admin access required." AND the target rows survive byte-identical
//      (server-truth Prisma reads; the order's OrderEvent count unchanged);
//   5. LB2 (the field/existence walls): the minted ADMIN session crafts the
//      invalid shapes — stock −1 / 1000 / 1.5 / "abc" and status "banana"
//      → "Check the highlighted fields."; unknown productId → "That piece
//      no longer exists."; unknown orderId → "That order no longer
//      exists." — all with zero writes;
//   6. LB3 (the controls — the false-positive guards): the SAME admin
//      session crafts a LAWFUL product update (a real product + a
//      run-unique stock) → ok:true AND the write LANDS server-truth
//      (restored in the finally); the order action's CURRENT-status
//      zero-write shape → ok:true with the OrderEvent count unchanged;
//   7. kill → cleanup confirmed (the tmpdir gone, the dev/e2e DBs
//      untouched).
// Exits nonzero on any assumption failure.
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const PORT = 3209;
const BASE = `http://localhost:${PORT}`;
const SECRET = "session48-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const PRODUCTS_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/admin/products/page/server-reference-manifest.json",
);
const ORDERS_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/admin/orders/page/server-reference-manifest.json",
);

// The healthy throwaway DB: a copy of the dev DB, deleted with the probe.
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe-session48-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;

const SUFFIX = crypto.randomBytes(6).toString("hex");
const CUST_TOKEN = `fss-cust-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;
const ADMIN_TOKEN = `fss-admin-${SUFFIX}-${crypto.randomBytes(24).toString("hex")}`;

const ADMIN_REQUIRED_MSG = "Admin access required.";
const FIELDS_MSG = "Check the highlighted fields.";
const NO_PRODUCT_MSG = "That piece no longer exists.";
const NO_ORDER_MSG = "That order no longer exists.";
const CONTROL_STOCK = 77;

function results(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) process.exitCode = 1;
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

/** Read rows through Prisma on the COPY (the F-II/F-KK/F-NN helper's shape). */
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

function signToken(token) {
  return `${token}.${crypto.createHmac("sha256", SECRET).update(token).digest("base64url")}`;
}

/** The F-QQ multipart fetch-action shape, addressed at a route the action's
 * manifest carries (the admin actions bind to /admin/products and /admin/orders). */
async function postFormAction(route, actionId, fields, cookie) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(`_1_${k}`, v);
  fd.set("0", '[null,"$K1"]');
  const res = await fetch(`${BASE}${route}`, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
      ...(cookie ? { Cookie: `aurelia_session=${cookie}` } : {}),
    },
    body: fd,
    signal: AbortSignal.timeout(15_000),
  });
  return { status: res.status, body: await res.text() };
}

function readManifest(file) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.entries(manifest.node ?? {}).map(([id, v]) => ({ id, exportedName: v.exportedName }));
}

(async function main() {
  let child = null;
  try {
    // The throwaway copy: the healthy dev DB (james + admin rows + the
    // canonical catalog/orders present).
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

    // The mints (idempotent delete-then-insert, INSERT..SELECT the userId
    // by email — never hardcoded): james (customer) + the seeded admin.
    sqlRun(
      `DELETE FROM "Session" WHERE token IN ('${CUST_TOKEN}', '${ADMIN_TOKEN}');\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fss-cust-${SUFFIX}', '${CUST_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fss-admin-${SUFFIX}', '${ADMIN_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';`,
    );
    const CUST_COOKIE = signToken(CUST_TOKEN);
    const ADMIN_COOKIE = signToken(ADMIN_TOKEN);

    child = await bootServer(PROBE_DB_URL);

    // --- 1. boot control ---
    const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBody = await health.text();
    results(
      "1. throwaway healthy-copy server boots (/api/health)",
      health.status === 200 && healthBody.includes('"ok":true') && healthBody.includes('"db":true'),
      `${health.status} ${healthBody.slice(0, 80)}`,
    );

    // --- 2. manifest canaries (both admin routes) ---
    const prodEntries = readManifest(PRODUCTS_MANIFEST);
    const ordEntries = readManifest(ORDERS_MANIFEST);
    const prodByName = (n) => prodEntries.filter((e) => e.exportedName === n);
    const ordByName = (n) => ordEntries.filter((e) => e.exportedName === n);
    const okProd = prodEntries.length === 3 && prodByName("adminUpdateProductAction").length === 1;
    const okOrd = ordEntries.length === 3 && ordByName("adminUpdateOrderAction").length === 1;
    results(
      "2. both admin route manifests: exactly 3 ids; the two admin actions present",
      okProd && okOrd,
      `products ids=${prodEntries.length} adminProduct=${prodByName("adminUpdateProductAction").length}; orders ids=${ordEntries.length} adminOrder=${ordByName("adminUpdateOrderAction").length}`,
    );
    const productId = prodByName("adminUpdateProductAction")[0].id;
    const orderId = ordByName("adminUpdateOrderAction")[0].id;

    // Runtime-resolved canonical targets (never hardcoded rowids):
    // a product no other stock-writing spec touches + the first canonical order.
    const product = JSON.parse(
      dbRead(`(p)=>p.product.findUnique({where:{slug:"leather-crossbody-bag"},select:{id:true,stock:true,isActive:true}})`),
    );
    const order = JSON.parse(
      dbRead(`(p)=>p.order.findFirst({orderBy:{placedAt:"asc"},select:{id:true,number:true,status:true,carrier:true,trackingNumber:true}})`),
    );
    const eventsBefore = Number(
      JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)),
    );
    results(
      "2b. canonical targets resolve on the copy",
      Boolean(product?.id) && Boolean(order?.id),
      `product stock=${product?.stock} isActive=${product?.isActive}; order ${order?.number} status=${order?.status}; events=${eventsBefore}`,
    );

    // --- 3. the role wall's unauthenticated half (cookie-less) ---
    const unauthProd = await postFormAction("/admin/products", productId, { productId: product.id, stock: "1" });
    const unauthOrd = await postFormAction("/admin/orders", orderId, { orderId: order.id, status: "delivered" });
    results(
      "3. cookie-less probes answer the role wall ('Admin access required.')",
      unauthProd.status === 200 && unauthProd.body.includes(ADMIN_REQUIRED_MSG) && !unauthProd.body.includes("Internal Server Error") &&
        unauthOrd.status === 200 && unauthOrd.body.includes(ADMIN_REQUIRED_MSG) && !unauthOrd.body.includes("Internal Server Error"),
      `product ${unauthProd.status}; order ${unauthOrd.status}`,
    );

    // --- 4. LB1 (the role walls): the CUSTOMER session's hostile crafts ---
    const hostileProd = await postFormAction("/admin/products", productId, { productId: product.id, stock: "1" }, CUST_COOKIE);
    const hostileOrd = await postFormAction("/admin/orders", orderId, { orderId: order.id, status: "delivered" }, CUST_COOKIE);
    const okHostileEnvelope =
      hostileProd.status === 200 && hostileProd.body.includes(ADMIN_REQUIRED_MSG) && hostileProd.body.includes('"ok":false') &&
      hostileOrd.status === 200 && hostileOrd.body.includes(ADMIN_REQUIRED_MSG) && hostileOrd.body.includes('"ok":false');
    const prodAfterHostile = JSON.parse(dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true,isActive:true}})`));
    const ordAfterHostile = JSON.parse(
      dbRead(`(p)=>p.order.findUnique({where:{id:"${order.id}"},select:{status:true,carrier:true,trackingNumber:true}})`),
    );
    const eventsAfterHostile = Number(JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)));
    const okNoWrites =
      prodAfterHostile.stock === product.stock && prodAfterHostile.isActive === product.isActive &&
      ordAfterHostile.status === order.status && ordAfterHostile.carrier === order.carrier && ordAfterHostile.trackingNumber === order.trackingNumber &&
      eventsAfterHostile === eventsBefore;
    results(
      "4. LB1 the role walls: the customer's hostile crafts denied; rows byte-identical",
      okHostileEnvelope && okNoWrites,
      `envelope=${okHostileEnvelope}; no-writes=${okNoWrites} (stock ${product.stock}→${prodAfterHostile.stock}; status ${order.status}→${ordAfterHostile.status}; events ${eventsBefore}→${eventsAfterHostile})`,
    );

    // --- 5. LB2 (the field/existence walls): the ADMIN session's invalid crafts ---
    const badStock = [];
    for (const s of ["-1", "1000", "1.5", "abc"]) {
      const r = await postFormAction("/admin/products", productId, { productId: product.id, stock: s }, ADMIN_COOKIE);
      badStock.push(r.status === 200 && r.body.includes(FIELDS_MSG) && r.body.includes('"ok":false') && !r.body.includes("Internal Server Error"));
    }
    const badStatus = await postFormAction("/admin/orders", orderId, { orderId: order.id, status: "banana" }, ADMIN_COOKIE);
    const okBadStatus = badStatus.status === 200 && badStatus.body.includes(FIELDS_MSG) && badStatus.body.includes('"ok":false');
    const noProduct = await postFormAction("/admin/products", productId, { productId: `fss-nonexistent-${SUFFIX}`, stock: "5" }, ADMIN_COOKIE);
    const okNoProduct = noProduct.status === 200 && noProduct.body.includes(NO_PRODUCT_MSG) && noProduct.body.includes('"ok":false');
    const noOrder = await postFormAction("/admin/orders", orderId, { orderId: `fss-nonexistent-${SUFFIX}` }, ADMIN_COOKIE);
    const okNoOrder = noOrder.status === 200 && noOrder.body.includes(NO_ORDER_MSG) && noOrder.body.includes('"ok":false');
    const prodAfterBad = JSON.parse(dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true,isActive:true}})`));
    const eventsAfterBad = Number(JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)));
    results(
      "5. LB2 the field/existence walls: 4 bad stocks + bad status + 2 unknown ids all denied, zero writes",
      badStock.every(Boolean) && okBadStatus && okNoProduct && okNoOrder &&
        prodAfterBad.stock === product.stock && prodAfterBad.isActive === product.isActive && eventsAfterBad === eventsBefore,
      `stocks=[${badStock.join(",")}]; status=${okBadStatus}; noProduct=${okNoProduct}; noOrder=${okNoOrder}; stock still ${prodAfterBad.stock}; events ${eventsAfterBad}`,
    );

    // --- 6. LB3 (the controls): the ADMIN session's LAWFUL crafts ---
    const controlProd = await postFormAction("/admin/products", productId, { productId: product.id, stock: String(CONTROL_STOCK) }, ADMIN_COOKIE);
    const prodAfterControl = JSON.parse(dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true}})`));
    const okControlWrite = controlProd.status === 200 && controlProd.body.includes('"ok":true') && prodAfterControl.stock === CONTROL_STOCK;
    // Restore the captured stock immediately (the shared-DB discipline).
    sqlRun(`UPDATE "Product" SET stock = ${product.stock} WHERE id = '${product.id}';`);
    // The order action's ZERO-WRITE lawful shape: the CURRENT status → the
    // transaction writes nothing, no events minted.
    const controlOrd = await postFormAction("/admin/orders", orderId, { orderId: order.id, status: order.status }, ADMIN_COOKIE);
    const eventsAfterControl = Number(JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)));
    const okControlOrder = controlOrd.status === 200 && controlOrd.body.includes('"ok":true') && eventsAfterControl === eventsBefore;
    const prodRestored = JSON.parse(dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true}})`));
    results(
      "6. LB3 the controls: the admin's lawful product craft WRITES (restored); the order's current-status craft is a zero-write ok",
      okControlWrite && okControlOrder && prodRestored.stock === product.stock,
      `write=${okControlWrite} (${product.stock}→${prodAfterControl.stock}→restored ${prodRestored.stock}); orderOk=${okControlOrder}; events ${eventsBefore}→${eventsAfterControl}`,
    );

    // --- 7. cleanup ---
    sqlRun(`DELETE FROM "Session" WHERE token IN ('${CUST_TOKEN}', '${ADMIN_TOKEN}');`);
    results("7. minted session rows cleaned on the copy", true, "prefix-scoped DELETE ran");
  } catch (err) {
    console.error("PROBE ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 600));
      child.kill("SIGKILL");
    }
    try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* already gone */ }
    const gone = !fs.existsSync(TMPDIR);
    console.log(`${gone ? "PASS" : "FAIL"}  8. tmpdir removed`);
    if (!gone) process.exitCode = 1;
  }
})();
