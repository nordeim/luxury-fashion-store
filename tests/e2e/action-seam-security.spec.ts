// Action-seam security gate (session-21, H-59 + IDOR census).
//
// The disclosed E2E gap ("UI surfaces cannot post a foreign size", carried
// since session 9) is closed over the WIRE — no DB-mocking harness needed:
// a Next.js server action is an HTTP endpoint. POSTing the page URL with
// `Next-Action: <actionId>` and a JSON-array body invokes the action
// server-side exactly as invoked. The canonical seed IS the fixture.
//
// The action IDs are read from the standalone's per-route manifest
// (.next/standalone/.next/server/app/(storefront)/product/[slug]/page/
// server-reference-manifest.json) — the authoritative set for the PDP
// route. Candidates are discriminated with a WRITE-FREE probe ladder
// (every probe's rejection precedes any DB access — measured first-hand):
//
//   P1 ["<nonexistent>", "XXL", 1]  → cart-line actions answer
//      "That bag line no longer exists."; product-arg actions answer
//      "This piece is no longer available.".
//   P2 ["<nonexistent>"]            → addToCartAction fails its Zod gate
//      ("Invalid bag request." — the qty arg is absent); toggleWishlist
//      still answers "This piece is no longer available.".
//   P3 [<seedProductId>, "XXL", 1]  → sent ONLY to the candidate
//      identified as addToCartAction; the H-59 sizeAllowed branch rejects
//      with "Invalid bag request." BEFORE any cart work — no Set-Cookie,
//      no rows.
//
// Probes run UNAUTHENTICATED (a fresh cookie-less request context — the
// projects' storageState must not leak into the wire calls).
import { expect, request as playwrightRequest, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHmac, randomBytes } from "node:crypto";
import { E2E_AUTH_SECRET } from "./e2e-secrets";

// Trap #13 discipline: process.cwd()-based paths (the Playwright loader
// compiles TS as CJS; import.meta is unavailable).
const REPO = process.cwd();
const MANIFEST_PATH = path.join(
  REPO,
  ".next/standalone/.next/server/app/(storefront)/product/[slug]/page/server-reference-manifest.json",
);
const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
// L-2 doctrine: the seed IS the contract — the reference slug is pinned
// (the canonical catalog's first active piece; verified against the seed).
const SEED_SLUG = "silk-draped-evening-gown";
const PDP_PATH = `/product/${SEED_SLUG}`;
// A standalone request context carries NO baseURL — mirror the config's
// port resolution (E2E_PORT honored, :3100 default) for the absolute URL.
const BASE_URL = `http://localhost:${Number(process.env.E2E_PORT ?? 3100)}`;

const UNIQUE_MSG = "Invalid bag request."; // ONLY the H-59 branch emits this (verified against src/)
const NOT_FOUND_MSG = "This piece is no longer available.";
const LINE_GONE_MSG = "That bag line no longer exists.";

interface SeedProduct {
  id: string;
  slug: string;
}

/** SQL fixture helper — the established `prisma db execute` pattern (H-2/M-1). */
function sqlRun(sql: string): void {
  const dir = mkdtempSync(path.join(os.tmpdir(), "action-seam-"));
  const file = path.join(dir, "fixture.sql");
  writeFileSync(file, sql);
  try {
    const res = spawnSync(
      "npx",
      ["prisma", "db", "execute", "--schema", SCHEMA, "--file", file],
      { env: { ...process.env, DATABASE_URL: E2E_DB_URL }, stdio: "pipe", encoding: "utf8" },
    );
    if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  } finally {
    unlinkSync(file);
  }
}

/** Read helper — prisma db execute cannot return rows; a tiny node -e with
 * the repo's own PrismaClient prints JSON to stdout (scratch-probe pattern).
 * spawnSync with an args ARRAY — no shell, so `$disconnect` survives intact. */
function dbRead(jsonExpression: string): string {
  const script = `const {PrismaClient}=require("@prisma/client");const p=new PrismaClient({datasources:{db:{url:"${E2E_DB_URL}"}}});(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
  const res = spawnSync("node", ["-e", script], {
    cwd: REPO,
    env: { ...process.env, DATABASE_URL: E2E_DB_URL },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`dbRead failed: ${res.stderr?.slice(0, 300)}`);
  const marker = (res.stdout ?? "").indexOf("<<JSON>>");
  if (marker < 0) throw new Error(`dbRead produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
  return res.stdout.slice(marker + "<<JSON>>".length).trim();
}

/** Unauthenticated wire call to the action seam (measured format).
 * A fresh cookie-less APIRequestContext per call — the projects'
 * storageState (the demo user's session) must never ride the probes.
 * Set-Cookie is detected via headersArray() (headers() collapses repeats). */
async function postAction(
  actionId: string,
  payload: unknown[],
): Promise<{ status: number; body: string; setCookie: string | undefined }> {
  const ctx = await playwrightRequest.newContext();
  try {
    const res = await ctx.post(`${BASE_URL}${PDP_PATH}`, {
      headers: { "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8" },
      data: JSON.stringify(payload),
    });
    const cookie = res
      .headersArray()
      .filter((h) => h.name.toLowerCase() === "set-cookie")
      .map((h) => h.value)
      .join("\n");
    return {
      status: res.status(),
      body: await res.text(),
      setCookie: cookie || undefined,
    };
  } finally {
    await ctx.dispose();
  }
}

function readManifestIds(): string[] {
  // The build-shape canary: a Next.js upgrade that moves/reshapes the
  // manifest fails HERE, loudly, instead of silently passing the gate.
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  return Object.keys(manifest.node ?? {});
}

async function seedProduct(): Promise<SeedProduct> {
  const raw = dbRead(
    `(p)=>p.product.findFirst({where:{isActive:true,slug:"${SEED_SLUG}"},select:{id:true,slug:true}})`,
  );
  const product = JSON.parse(raw) as SeedProduct;
  expect(product.id, `seed product ${SEED_SLUG} must exist`).toBeTruthy();
  return product;
}

test.describe("action seam security (H-59 + IDOR census)", () => {
  test("the PDP route manifest exposes exactly four action ids", () => {
    const ids = readManifestIds();
    expect(ids.length, `manifest at ${MANIFEST_PATH}`).toBe(4);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{40,}$/);
  });

  test("addToCartAction rejects a foreign size over the wire (H-59 closed)", async () => {
    const ids = readManifestIds();
    const product = await seedProduct();

    // P1 — classify (write-free: every rejection precedes any DB access).
    const lineActions: string[] = [];
    const productActions: string[] = [];
    for (const id of ids) {
      const r = await postAction(id, ["nonexistent-action-probe-id", "XXL", 1]);
      expect(r.status, "action errors are envelopes, never 5xx").toBe(200);
      expect(r.body).not.toContain("Internal Server Error");
      if (r.body.includes(LINE_GONE_MSG)) lineActions.push(id);
      else if (r.body.includes(NOT_FOUND_MSG)) productActions.push(id);
      else throw new Error(`P1 probe of ${id} answered neither known rejection: ${r.body.slice(0, 200)}`);
    }
    expect(lineActions, "two cart-line actions on the PDP route").toHaveLength(2);
    expect(productActions, "two product-arg actions on the PDP route").toHaveLength(2);

    // P2 — split addToCart (Zod gate fires on the absent qty) from
    // toggleWishlist (product lookup) — still write-free.
    const addToCartCandidates: string[] = [];
    for (const id of productActions) {
      const r = await postAction(id, ["nonexistent-action-probe-id"]);
      expect(r.status).toBe(200);
      if (r.body.includes(UNIQUE_MSG)) addToCartCandidates.push(id);
      else expect(r.body, "wishlist discriminator").toContain(NOT_FOUND_MSG);
    }
    expect(addToCartCandidates, "exactly one addToCartAction").toHaveLength(1);

    // P3 — the H-59 payload itself: real seed product, foreign size. The
    // allowlist branch (NOT the Zod gate — Zod passes: productId exists,
    // size ≤ 20 chars, qty int) must reject BEFORE any cart work.
    const probe = await postAction(addToCartCandidates[0], [product.id, "XXL", 1]);
    expect(probe.status).toBe(200);
    expect(probe.body, "the H-59 sizeAllowed branch fired").toContain(UNIQUE_MSG);
    expect(probe.setCookie, "no cart cookie minted on rejection").toBeUndefined();

    // Write-freedom proof at the DB layer: zero bag lines for the seed
    // product after the whole ladder (the probe never wrote).
    const count = JSON.parse(dbRead(`(p)=>p.cartItem.count({where:{productId:"${product.id}"}})`));
    expect(count, "the crafted call must not persist anything").toBe(0);
  });

  test("cart-line probes fail closed on a foreign bag (IDOR census)", async () => {
    const ids = readManifestIds();
    const lineActions: string[] = [];
    for (const id of ids) {
      const r = await postAction(id, ["nonexistent-action-probe-id", "XXL", 1]);
      if (r.body.includes(LINE_GONE_MSG)) lineActions.push(id);
    }
    expect(lineActions.length).toBeGreaterThanOrEqual(1);

    // SQL fixture: a GUEST bag (userId NULL, token-derived id) with one line
    // on a SECOND seed product — isolated from the H-59 case's count pin.
    const token = `idor-probe-${randomBytes(16).toString("hex")}`;
    const second = JSON.parse(
      dbRead(
        `(p)=>p.product.findFirst({where:{isActive:true,slug:{not:"${SEED_SLUG}"}},select:{id:true,slug:true}})`,
      ),
    ) as SeedProduct;
    expect(second.id).toBeTruthy();
    const cartId = `idor-probe-cart-${randomBytes(12).toString("hex")}`;
    const itemId = `idor-probe-item-${randomBytes(12).toString("hex")}`;
    sqlRun(
      `DELETE FROM "CartItem" WHERE "cartId" = '${cartId}';\n` +
        `DELETE FROM "Cart" WHERE "token" = '${token}';\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") ` +
        `VALUES ('${cartId}','${token}',NULL,datetime('now'),datetime('now'));\n` +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") ` +
        `VALUES ('${itemId}','${cartId}','${second.id}','M',1,datetime('now'),datetime('now'));`,
    );
    try {
      for (const id of lineActions) {
        // adjust-shaped (id, delta) and remove-shaped (id) probes — both
        // unauthenticated against a foreign bag: fail closed, never 5xx.
        for (const payload of [[itemId, 1], [itemId]]) {
          const r = await postAction(id, payload);
          expect(r.status, "ownership walls answer with envelopes").toBe(200);
          expect(r.body).not.toContain("Internal Server Error");
          expect(r.body, `probe ${payload.length === 1 ? "remove" : "adjust"}-shaped on ${id.slice(0, 8)} must fail closed`).toContain('"ok":false');
          expect(r.setCookie, "a failed foreign-bag probe mints nothing").toBeUndefined();
        }
      }
      // The ownership wall held: the fixture line is UNTOUCHED.
      const item = JSON.parse(
        dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${itemId}"},select:{quantity:true}})`),
      );
      expect(item, "the foreign bag line survives the wire attack").toBeTruthy();
      expect(item.quantity).toBe(1);
    } finally {
      sqlRun(
        `DELETE FROM "CartItem" WHERE "cartId" = '${cartId}';\n` +
          `DELETE FROM "Cart" WHERE "token" = '${token}';`,
      );
    }
  });

  test("every crafted probe stays fail-closed across the route's action surface", async () => {
    const ids = readManifestIds();
    // The write-free payloads only (P1/P2): classify and reject — never a
    // 5xx, never a Set-Cookie, always an ok:false envelope.
    for (const id of ids) {
      for (const payload of [
        ["nonexistent-action-probe-id", "XXL", 1],
        ["nonexistent-action-probe-id"],
      ]) {
        const r = await postAction(id, payload);
        expect(r.status, `${id.slice(0, 8)} × ${payload.length}-arg`).toBe(200);
        expect(r.body).not.toContain("Internal Server Error");
        expect(r.body).toContain('"ok":false');
        expect(r.setCookie).toBeUndefined();
      }
    }
  });
});

// F-UU (session-50) — the cart-line actions' SIGNED-IN ownership wall, the
// foreign-USER half the census never reached. HARNESS FACT (measured
// first-hand this round): Playwright's `request.newContext()` applies the
// project's `use.storageState`, so the census's "cookie-less" crafts have
// been SIGNED-IN all along — its guest-bag probes hit the USER branch
// (wall: NULL owner ≠ james.id → deny) and stay green, masking the ride.
// The census therefore gates the wall's NULL-OWNER half (accidentally, via
// the riding session); NO gate ever crafted against a FOREIGN-USER-owned
// bag — and `grep "Sign in to manage this bag" tests/` returned ZERO hits.
// A dropped wall lets any signed-in customer DESTROY (the −N adjust's
// planCorrection delete, or the remove craft) or CORRUPT (a +N inflate
// toward the stock clamp) ANOTHER user's bag line by id over the wire —
// the exact cross-user data-destruction class F-RR closed for addresses —
// while every existing case stays green on the foreign-USER shape (the
// mutation demos re-measured the bite: the census co-bites on its
// NULL-owner shape, F-UU owns the foreign-USER shape). Pinned through the
// SAME H-59 JSON-arg wire shape authenticated by an offline-minted james
// session riding an EXPLICIT Cookie header on Node fetch (the F-RR wire
// fact + the F-TT jar lesson: the APIRequestContext jar drops the
// production-Secure cookie over http — never the jar), against a VICTIM
// cart minted for the ADMIN user. The harm is server-truth-only (the
// foreign row never renders for the attacker), so every victim assertion
// reads rows through Prisma — the wire envelope alone proves nothing.
test.describe("cart-line user-ownership walls (F-UU, session-50)", () => {
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-uu-fixture.sql");

  // Which own-cart row THIS worker minted (afterAll deletes only that —
  // never a real cart row a UI spec depends on). Module state is per worker
  // process; each project's beforeAll recomputes it idempotently.
  let ownCartMinted: string | undefined;

  // Per-worker mint identity (the F-RR shape): each device project's worker
  // mints its own rows — delete-then-insert is idempotent; the serial
  // topology keeps the windows non-overlapping; afterAll cleans each set.
  const SUFFIX = randomBytes(6).toString("hex");
  const TOKEN = `fuu-${SUFFIX}-${randomBytes(24).toString("hex")}`;
  const SESSION_ID = `fuu-sess-${SUFFIX}`;
  const VICTIM_CART_ID = `fuu-vcart-${SUFFIX}`;
  const VICTIM_ITEM_ID = `fuu-vitem-${SUFFIX}`;
  const OWN_CART_ID = `fuu-ocart-${SUFFIX}`;
  const OWN_ITEM_A = `fuu-oitema-${SUFFIX}`;
  const OWN_ITEM_B = `fuu-oitemb-${SUFFIX}`;
  const VICTIM_SIZE = `FUU-${SUFFIX.slice(0, 6)}`;
  const COOKIE = `${TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET).update(TOKEN).digest("base64url")}`;

  const SIGN_IN_MSG = "Sign in to manage this bag.";
  const GUEST_ENVELOPE = "That bag line no longer exists.";

  /** SQL fixture helper — the established `prisma db execute` pattern (H-2/M-1). */
  function sqlRun(sql: string): void {
    writeFileSync(SQL_SCRATCH, sql);
    try {
      const res = spawnSync(
        "npx",
        ["prisma", "db", "execute", "--schema", path.join(REPO, "prisma", "schema.prisma"), "--file", SQL_SCRATCH],
        {
          cwd: REPO,
          env: { ...process.env, DATABASE_URL: E2E_DB_URL },
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf8",
        },
      );
      if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
    } finally {
      try { unlinkSync(SQL_SCRATCH); } catch { /* already gone */ }
    }
  }

  /** Read rows through Prisma on the E2E DB (the F-II/F-KK/F-NN helper's shape). */
  function dbRead(jsonExpression: string): string {
    const script = `const {PrismaClient}=require("@prisma/client");const p=new PrismaClient({datasources:{db:{url:"${E2E_DB_URL}"}}});(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
    const res = spawnSync("node", ["-e", script], {
      cwd: REPO,
      env: { ...process.env, DATABASE_URL: E2E_DB_URL },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    if (res.status !== 0) throw new Error(`dbRead failed: ${res.stderr?.slice(0, 300)}`);
    const marker = (res.stdout ?? "").indexOf("<<JSON>>");
    if (marker < 0) throw new Error(`dbRead produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
    return res.stdout.slice(marker + "<<JSON>>".length).trim();
  }

  /** The H-59 JSON-arg craft + the EXPLICIT session cookie (the F-RR shape). */
  async function postJsonAction(
    actionId: string,
    payload: unknown[],
    cookie?: string,
  ): Promise<{ status: number; body: string; setCookies: string[] }> {
    const res = await fetch(`${BASE_URL}${PDP_PATH}`, {
      method: "POST",
      headers: {
        "Next-Action": actionId,
        "Content-Type": "text/plain;charset=UTF-8",
        ...(cookie ? { Cookie: `aurelia_session=${cookie}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    return { status: res.status, body: await res.text(), setCookies: res.headers.getSetCookie?.() ?? [] };
  }

  test.beforeAll(() => {
    // The mint (F-NN's shape, idempotent delete-then-insert):
    // (a) james's session — FUTURE expiry (+1 day; the read's inline prune
    //     only fires on PAST-expiry rows), ZERO logins;
    // (b) the VICTIM cart for the ADMIN user (INSERT..SELECT the userId —
    //     the seed ships NO cart rows, and earlier specs never shop as
    //     admin) + one VICTIM line on the canonical seed product with a
    //     fixture-unique size (no @@unique([cartId, productId, size])
    //     interference with any UI spec's lines);
    // (c) james's OWN control cart (action-seam-security runs before
    //     cart-checkout alphabetically, but GET-OR-CREATE guards either
    //     state: Cart.userId is UNIQUE — a blind INSERT would P2002 if a
    //     storageState flow already minted james's cart) + two OWN lines.
    const product = JSON.parse(
      dbRead(`(p)=>p.product.findFirst({where:{isActive:true,slug:"${SEED_SLUG}"},select:{id:true}})`),
    ) as { id: string };
    expect(product.id, `seed product ${SEED_SLUG} must exist`).toBeTruthy();
    const existingOwnCart = JSON.parse(dbRead(`(p)=>p.cart.findFirst({where:{user:{email:"james@example.com"}},select:{id:true}})`)) as { id: string } | null;
    const ownCartId = existingOwnCart?.id ?? OWN_CART_ID;
    sqlRun(
      `DELETE FROM "CartItem" WHERE "id" IN ('${VICTIM_ITEM_ID}','${OWN_ITEM_A}','${OWN_ITEM_B}');\n` +
        `DELETE FROM "Cart" WHERE "id" IN ('${VICTIM_CART_ID}','${OWN_CART_ID}');\n` +
        `DELETE FROM "Session" WHERE "token" = '${TOKEN}';\n` +
        `INSERT INTO "Session" ("id","token","userId","expiresAt","createdAt") ` +
        `SELECT '${SESSION_ID}', '${TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';\n` +
        `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") ` +
        `SELECT '${VICTIM_CART_ID}', 'fuu-vtoken-${SUFFIX}', id, datetime('now'), datetime('now') ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';\n` +
        // james's own cart row exists only when a storageState flow minted it
        // before this file — otherwise the CartItem FK below has no parent.
        (existingOwnCart
          ? ""
          : `INSERT INTO "Cart" ("id","token","userId","createdAt","updatedAt") ` +
            `SELECT '${OWN_CART_ID}', 'fuu-otoken-${SUFFIX}', id, datetime('now'), datetime('now') ` +
            `FROM "User" WHERE email = 'james@example.com';\n`) +
        `INSERT INTO "CartItem" ("id","cartId","productId","size","quantity","createdAt","updatedAt") VALUES ` +
        `('${VICTIM_ITEM_ID}','${VICTIM_CART_ID}','${product.id}','${VICTIM_SIZE}',2,datetime('now'),datetime('now')),\n` +
        `('${OWN_ITEM_A}','${ownCartId}','${product.id}','${VICTIM_SIZE}-A',1,datetime('now'),datetime('now')),\n` +
        `('${OWN_ITEM_B}','${ownCartId}','${product.id}','${VICTIM_SIZE}-B',3,datetime('now'),datetime('now'));`,
    );
    // Remember which cart rows WE minted (afterAll deletes only those —
    // never a real cart row a UI spec depends on).
    ownCartMinted = existingOwnCart ? undefined : ownCartId;
  });

  test.afterAll(() => {
    // Idempotent id-scoped cleanup (the session row is also covered by
    // global-setup's session wipe — belt and braces).
    sqlRun(
      `DELETE FROM "CartItem" WHERE "id" IN ('${VICTIM_ITEM_ID}','${OWN_ITEM_A}','${OWN_ITEM_B}');\n` +
        `DELETE FROM "Cart" WHERE "id" IN ('${VICTIM_CART_ID}'${ownCartMinted ? `,'${ownCartMinted}'` : ""});\n` +
        `DELETE FROM "Session" WHERE "token" = '${TOKEN}';`,
    );
  });

  test("the user-branch walls deny a foreign bag over the wire; the own id writes (F-UU)", async () => {
    test.setTimeout(90_000);

    // --- the manifest canary (the census's own build-shape gate) ---
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
      node: Record<string, { exportedName?: string }>;
    };
    const entries = Object.entries(manifest.node ?? {});
    expect(entries.length, `manifest at ${MANIFEST_PATH}`).toBe(4);
    const byName = (name: string) =>
      entries.filter(([, v]) => v.exportedName === name).map(([id]) => id);
    for (const [id] of entries) expect(id).toMatch(/^[0-9a-f]{40,}$/);
    const adjustIds = byName("adjustCartItemAction");
    const removeIds = byName("removeCartItemAction");
    expect(adjustIds, "exactly one adjustCartItemAction").toHaveLength(1);
    expect(removeIds, "exactly one removeCartItemAction").toHaveLength(1);
    const adjustId = adjustIds[0];
    const removeId = removeIds[0];

    // --- LB0: the auth wall stays first (cookie-less crafts take the guest
    // branch — the census's half; never 5xx, never a Set-Cookie) ---
    for (const [label, id, payload] of [
      ["adjust", adjustId, [VICTIM_ITEM_ID, -99]],
      ["remove", removeId, [VICTIM_ITEM_ID]],
    ] as const) {
      const r = await postJsonAction(id, [...payload]);
      expect(r.status, `${label}: action errors are envelopes, never 5xx`).toBe(200);
      expect(r.body).not.toContain("Internal Server Error");
      expect(r.body, `${label}: the guest-branch envelope fires first`).toContain(GUEST_ENVELOPE);
      expect(r.setCookies.length, `${label}: no cookie minted on a failed probe`).toBe(0);
    }

    // --- LB1: the walls (the authenticated crafts vs the VICTIM line) ---
    const victimBefore = JSON.parse(
      dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${VICTIM_ITEM_ID}"},select:{quantity:true,size:true}})`),
    ) as { quantity: number; size: string } | null;
    expect(victimBefore, "the victim row exists pre-ladder").toBeTruthy();
    expect(victimBefore!.quantity).toBe(2);

    // adjust-shaped — the DESTROY payload (delta −99 → planCorrection delete)
    const adjDeny = await postJsonAction(adjustId, [VICTIM_ITEM_ID, -99], COOKIE);
    expect(adjDeny.status).toBe(200);
    expect(adjDeny.body, "the adjust wall answers the ownership envelope").toContain(SIGN_IN_MSG);
    expect(adjDeny.body).toContain('"ok":false');
    expect(adjDeny.setCookies.length).toBe(0);

    // remove-shaped — the direct DESTROY craft
    const remDeny = await postJsonAction(removeId, [VICTIM_ITEM_ID], COOKIE);
    expect(remDeny.status).toBe(200);
    expect(remDeny.body, "the remove wall answers the ownership envelope").toContain(SIGN_IN_MSG);
    expect(remDeny.body).toContain('"ok":false');
    expect(remDeny.setCookies.length).toBe(0);

    // the victim row survives BYTE-IDENTICAL server-truth (the wire envelope
    // alone proves nothing — the harm is server-truth-only, per F-RR)
    const victimAfter = JSON.parse(
      dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${VICTIM_ITEM_ID}"},select:{quantity:true,size:true}})`),
    ) as { quantity: number; size: string } | null;
    expect(victimAfter, "the victim line survives both crafts").toBeTruthy();
    expect(victimAfter!.quantity).toBe(2);
    expect(victimAfter!.size).toBe(victimBefore!.size);

    // --- LB2: the false-positive guard (the OWN-id controls — the SAME wire
    // shapes WRITE when the wall passes) ---
    const ownUp = await postJsonAction(adjustId, [OWN_ITEM_A, 1], COOKIE);
    expect(ownUp.status).toBe(200);
    expect(ownUp.body, "own adjust +1 writes").toContain('"ok":true');
    const afterUp = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${OWN_ITEM_A}"},select:{quantity:true}})`)) as { quantity: number };
    expect(afterUp.quantity, "the +1 landed server-truth").toBe(2);

    const ownDown = await postJsonAction(adjustId, [OWN_ITEM_A, -1], COOKIE);
    expect(ownDown.status).toBe(200);
    expect(ownDown.body, "own adjust -1 restores").toContain('"ok":true');
    const afterDown = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${OWN_ITEM_A}"},select:{quantity:true}})`)) as { quantity: number };
    expect(afterDown.quantity, "the pre-state restored server-truth").toBe(1);

    const ownRemove = await postJsonAction(removeId, [OWN_ITEM_B], COOKIE);
    expect(ownRemove.status).toBe(200);
    expect(ownRemove.body, "own remove writes").toContain('"ok":true');
    const afterRemove = JSON.parse(dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${OWN_ITEM_B}"},select:{id:true}})`));
    expect(afterRemove, "the own line is GONE server-truth").toBeNull();

    // --- the final zero-delta on the victim (the ladder wrote nothing) ---
    const victimFinal = JSON.parse(
      dbRead(`(p)=>p.cartItem.findUnique({where:{id:"${VICTIM_ITEM_ID}"},select:{quantity:true,size:true}})`),
    ) as { quantity: number; size: string } | null;
    expect(victimFinal, "the victim line still exists post-ladder").toBeTruthy();
    expect(victimFinal!.quantity).toBe(2);
    expect(victimFinal!.size).toBe(victimBefore!.size);
  });
});
