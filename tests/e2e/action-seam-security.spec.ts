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
import { randomBytes } from "node:crypto";

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
