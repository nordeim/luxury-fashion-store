#!/usr/bin/env node
// Session-49 plan-validation probe — wire-verifies the F-TT contract
// assumptions BEFORE the spec is written (the standing §5 discipline: no
// unverified assumption enters a pin). Boots the standalone on :3209 as a
// THROWAWAY process against a healthy THROWAWAY COPY of db/custom.db (the
// wishlist action needs working DB reads/writes — getOrCreateWishlist must
// mint the guest row + cookie; the wishlist page render must read the DTO).
// Zero writes touch the dev DB or db/e2e.db; the throwaway copy (with the
// probe product, the minted wishlist rows, restored before the copy dies)
// is deleted with its tmpdir.
//
// THE WIRE SHAPE (the H-59 measured JSON-arg shape — toggleWishlistAction is
// a one-string-arg action):
//   POST /product/<canonical-slug>   (any route whose manifest carries the id)
//   Next-Action: <id>
//   Content-Type: text/plain;charset=UTF-8
//   body: JSON ["<productId>"]
//
// Checks (all on the wire / server-truth):
//   1. the healthy-copy server BOOTS and LISTENS (/api/health → 200 +
//      {"ok":true,"db":true});
//   2. the PDP route manifest exposes exactly 4 ids; toggleWishlistAction
//      identified by exportedName (the build-shape canary);
//   3. the INACTIVE probe product mints on the copy (isActive=0, run-unique
//      slug, the F-LL column template) and resolves at runtime;
//   4. HALF A (the bug, measured): the crafted toggle with the INACTIVE id
//      answers ok:true + wishlisted:true AND the WishlistItem row lands
//      server-truth (the missing wall, reproduced — HYPOTHESIS);
//   5. the badge-vs-page disagreement rendered END-TO-END: GET /wishlist
//      with the minted wishlist cookie → the header badge renders the RAW
//      count ("Wishlist, 1 item") while the empty-state guidance renders —
//      the user-visible symptom;
//   6. HALF A control: the SAME wire shape with an ACTIVE canonical id →
//      ok:true + the row lands (the false-positive guard: the wire shape
//      works, only the wall is missing);
//   7. HALF B (measured): GET /product/<inactive-slug> → the HTTP status +
//      the served head's <title> / og:image / product:price:amount vs the
//      same reads for an UNKNOWN slug (the pure-404 control) — the delta
//      decides whether the inactive head leaks (fix) or Next discards the
//      segment metadata on notFound() (document the non-issue);
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
const SECRET = "session49-probe-secret-0123456789abcdef";
const REPO = process.cwd();
const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
const PDP_MANIFEST = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/product/[slug]/page/server-reference-manifest.json",
);

// The throwaway DB: a copy of the dev DB, deleted with the probe.
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), `probe-session49-${process.pid}-`));
const PROBE_DB = path.join(TMPDIR, "copy.db");
const PROBE_DB_URL = `file:${PROBE_DB}`;

const SUFFIX = crypto.randomBytes(6).toString("hex");
const INACTIVE_SLUG = `ftt-inactive-${SUFFIX}`;
const INACTIVE_NAME = `F-TT Inactive Probe ${SUFFIX.slice(0, 6)}`;
const INACTIVE_ID = `ftt-probe-${SUFFIX}`;

const NO_LONGER_MSG = "This piece is no longer available.";

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

/** The H-59 JSON-arg action shape, addressed at the PDP route. Returns
 * status, body, and the aurelia_wishlist cookie minted (if any). */
async function postWishlistToggle(actionId, productId) {
  const res = await fetch(`${BASE}/product/leather-crossbody-bag`, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify([productId]),
    signal: AbortSignal.timeout(15_000),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const wlCookie = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("aurelia_wishlist="));
  return { status: res.status, body: await res.text(), wlCookie };
}

function readManifest(file) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.entries(manifest.node ?? {}).map(([id, v]) => ({ id, exportedName: v.exportedName }));
}

/** Pull the first <title>…</title> and selected metas out of a head dump. */
function headFacts(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "(none)";
  const ogImage = (html.match(/<meta[^>]+property="og:image"[^>]*>/i) ?? [])[0] ?? "(none)";
  const priceAmount = (html.match(/<meta[^>]+name="product:price:amount"[^>]*>/i) ?? [])[0] ?? "(none)";
  return { title: title.trim(), ogImage, priceAmount };
}

(async function main() {
  let child = null;
  try {
    // The throwaway copy: the healthy dev DB (canonical catalog present).
    fs.copyFileSync(path.join(REPO, "db", "custom.db"), PROBE_DB);

    // Mint the INACTIVE probe product (isActive=0, run-unique slug, the
    // F-LL/F-SS column template; full column set — the PDP metadata reads
    // name/images/price too).
    sqlRun(
      `DELETE FROM "Product" WHERE slug = '${INACTIVE_SLUG}';\n` +
        `INSERT INTO "Product" ("id","slug","name","brand","description","price","categoryId","subcategory","sortOrder","stock","isActive","createdAt","updatedAt") ` +
        `SELECT '${INACTIVE_ID}','${INACTIVE_SLUG}','${INACTIVE_NAME}','Probe Atelier',` +
        `'A deactivated probe piece whose head must not leak.',19900, ` +
        `(SELECT "id" FROM "Category" WHERE "slug"='accessories' LIMIT 1),'hats',999,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP;`,
    );

    child = await bootServer(PROBE_DB_URL);

    // --- 1. boot control ---
    const health = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const healthBody = await health.text();
    results(
      "1. throwaway healthy-copy server boots (/api/health)",
      health.status === 200 && healthBody.includes('"ok":true') && healthBody.includes('"db":true'),
      `${health.status} ${healthBody.slice(0, 80)}`,
    );

    // --- 2. manifest canary ---
    const entries = readManifest(PDP_MANIFEST);
    const byName = (n) => entries.filter((e) => e.exportedName === n);
    const okManifest = entries.length === 4 && byName("toggleWishlistAction").length === 1;
    results(
      "2. PDP route manifest: exactly 4 ids; toggleWishlistAction present",
      okManifest,
      `ids=${entries.length} toggleWishlist=${byName("toggleWishlistAction").length} names=[${entries.map((e) => e.exportedName).join(",")}]`,
    );
    const toggleId = byName("toggleWishlistAction")[0].id;

    // --- 3. the inactive probe product resolves on the copy ---
    const inactive = JSON.parse(
      dbRead(`(p)=>p.product.findUnique({where:{slug:"${INACTIVE_SLUG}"},select:{id:true,isActive:true,name:true}})`),
    );
    const active = JSON.parse(
      dbRead(`(p)=>p.product.findFirst({where:{isActive:true,slug:"silk-draped-evening-gown"},select:{id:true,slug:true}})`),
    );
    results(
      "3. the inactive probe product + the active control resolve",
      Boolean(inactive?.id) && inactive.isActive === false && Boolean(active?.id),
      `inactive=${inactive?.id?.slice(0, 14)}… isActive=${inactive?.isActive}; active=${active?.slug}`,
    );

    // --- 4. HALF A (the bug, measured): the crafted toggle with the INACTIVE id ---
    const inactiveToggle = await postWishlistToggle(toggleId, inactive.id);
    const inactiveOkEnvelope =
      inactiveToggle.status === 200 &&
      inactiveToggle.body.includes('"ok":true') &&
      inactiveToggle.body.includes('"wishlisted":true');
    const inactiveRow = JSON.parse(
      dbRead(`(p)=>p.wishlistItem.findFirst({where:{productId:"${inactive.id}"},select:{id:true,wishlistId:true}})`),
    );
    results(
      "4. HALF A the missing wall reproduced: the INACTIVE id toggles ok:true + the row LANDS (the bug)",
      inactiveOkEnvelope && Boolean(inactiveRow?.id) && Boolean(inactiveToggle.wlCookie),
      `envelope=${inactiveOkEnvelope}; row=${inactiveRow ? "MINTED" : "absent"}; cookie=${inactiveToggle.wlCookie ? "minted" : "none"}; body=${inactiveToggle.body.slice(0, 120)}`,
    );

    // --- 5. the badge-vs-page disagreement, rendered end-to-end ---
    const wlPage = await fetch(`${BASE}/wishlist`, {
      headers: { Cookie: inactiveToggle.wlCookie ?? "" },
      signal: AbortSignal.timeout(15_000),
    });
    const wlBody = await wlPage.text();
    const badgeCounts = wlBody.includes("Wishlist, 1 item");
    const emptyGuidance = wlBody.includes("Tap the heart on any piece to save it for later.");
    const cardHidden = !wlBody.includes(INACTIVE_NAME);
    results(
      "5. the badge-vs-page disagreement renders: badge 'Wishlist, 1 item' + the empty-state guidance, card absent",
      wlPage.status === 200 && badgeCounts && emptyGuidance && cardHidden,
      `status=${wlPage.status}; badge=${badgeCounts}; emptyGuidance=${emptyGuidance}; cardHidden=${cardHidden}`,
    );

    // --- 6. HALF A control: the ACTIVE canonical id toggles ok ---
    const activeToggle = await postWishlistToggle(toggleId, active.id);
    const activeRow = JSON.parse(
      dbRead(`(p)=>p.wishlistItem.findFirst({where:{productId:"${active.id}"},select:{id:true}})`),
    );
    results(
      "6. the ACTIVE control: the same wire shape toggles ok + the row lands (the false-positive guard)",
      activeToggle.status === 200 && activeToggle.body.includes('"ok":true') && Boolean(activeRow?.id),
      `status=${activeToggle.status}; row=${activeRow ? "MINTED" : "absent"}`,
    );

    // --- 7. HALF B (measured): the inactive PDP's status + head ---
    const inactivePage = await fetch(`${BASE}/product/${INACTIVE_SLUG}`, { signal: AbortSignal.timeout(15_000) });
    const inactiveHtml = await inactivePage.text();
    const inactiveFacts = headFacts(inactiveHtml);
    const unknownPage = await fetch(`${BASE}/product/ftt-unknown-${SUFFIX}`, { signal: AbortSignal.timeout(15_000) });
    const unknownHtml = await unknownPage.text();
    const unknownFacts = headFacts(unknownHtml);
    const inactive404 = inactivePage.status === 404;
    const titleLeaks = inactiveFacts.title.includes(INACTIVE_NAME);
    // Coarse "http present" is NOT a leak signal (the root share card is an
    // http URL too) — the leak is the inactive head DIVERGING from the
    // pure-404 control (the product's own image URL / price present).
    const ogLeaks = inactiveFacts.ogImage !== unknownFacts.ogImage;
    const priceLeaks = inactiveFacts.priceAmount !== "(none)" && inactiveFacts.priceAmount !== unknownFacts.priceAmount;
    const headIdentical =
      inactiveFacts.title === unknownFacts.title &&
      inactiveFacts.ogImage === unknownFacts.ogImage &&
      inactiveFacts.priceAmount === unknownFacts.priceAmount;
    results(
      "7. HALF B measured: the inactive PDP 404s — head identical to the pure-404 control?",
      inactive404 && headIdentical,
      `status=${inactivePage.status} (expect 404); inactiveHead title='${inactiveFacts.title.slice(0, 40)}' ogImage=${inactiveFacts.ogImage.slice(0, 80)} price=${inactiveFacts.priceAmount.slice(0, 60)}; unknownHead title='${unknownFacts.title.slice(0, 40)}' ogImage=${unknownFacts.ogImage.slice(0, 80)} price=${unknownFacts.priceAmount.slice(0, 60)}`,
    );
    console.log(
      `      (verdict) titleLeak=${titleLeaks}; ogDiverges=${ogLeaks}; priceDiverges=${priceLeaks}; ` +
        `headIdentical=${headIdentical} → ${headIdentical && !titleLeaks && !ogLeaks && !priceLeaks ? "NO LEAK — Next discards the segment metadata on notFound(); half B documents as a NON-ISSUE" : "LEAK — half B lands in the fix"}`,
    );

    // --- 8. cleanup (the copy dies with the tmpdir; belt-and-braces deletes) ---
    sqlRun(`DELETE FROM "WishlistItem" WHERE "productId" IN ('${inactive.id}', '${active.id}');`);
    sqlRun(`DELETE FROM "Wishlist" WHERE "token" NOT IN (SELECT "token" FROM "Wishlist" WHERE "userId" IS NOT NULL) AND "userId" IS NULL;`);
    sqlRun(`DELETE FROM "Product" WHERE slug = '${INACTIVE_SLUG}';`);
    results("8. probe rows cleaned on the copy", true, "prefix-scoped DELETEs ran");
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
    console.log(`${gone ? "PASS" : "FAIL"}  9. tmpdir removed`);
    if (!gone) process.exitCode = 1;
  }
})();
