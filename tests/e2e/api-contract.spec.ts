// API contract gate (session-29, F-Y).
//
// README declares the API surface as a product contract — "/api/health,
// /api/search (typeahead), /api/newsletter — the only REST endpoints" — yet
// no prior round pinned the route HANDLERS over the wire: the action-seam
// gate (session-21) covers the server-action seam, the SEO gate covers
// robots/sitemap, the brand-metadata gate covers the head surfaces, and the
// only /api/health reference in tests/ was the sweep tool's URL builder
// (tooling, not a gate). The F-X lesson, one family out: a declared contract
// the gates never exercise can regress silently. This spec pins the four
// contract groups first-hand verified by the round's plan probe
// (scripts/plan-probe-session29.cjs — 13/13 before the spec was written):
//
// 1. /api/health — the liveness envelope: 200 + {ok:true, db:true} (ok stays
//    true even when the DB read fails, db:false carrying the diagnosis —
//    that failure shape is fault-injection territory, rejected per the F-I
//    precedent; the success shape is the wire pin).
// 2. /api/search — the empty-query fast path ({ok:true, results:[]}), the
//    hit DTO (slug/name/brand/image/price — price in INTEGER CENTS, the
//    money invariant at the wire), the F-12 best-effort degradation (a
//    no-hit query is 200 + [], never 404/500), and the limit clamp
//    (limit=1 honored; limit=99 clamped into the 1..10 band).
// 3. /api/newsletter — the success envelope ({ok:true}), the IDEMPOTENT
//    upsert (the same email twice: both success, exactly ONE row — the
//    row-count proof reads the seeded E2E DB via the scratch-probe pattern),
//    and the Zod 400 envelopes ({ok:false, error} for an invalid email and
//    for a malformed body). The spec mints a spec-unique subscriber row and
//    SQL-cleans it in afterAll (the H-24 discipline; NewsletterSubscriber is
//    content, not in global-setup's transient wipe list). Limiter
//    arithmetic: 4 requests here + 1 (the home UI test) = 5 < 10 per
//    standalone process — the 10/10min bucket stays unconsumed.
// 4. The method matrix — search/health export GET only, newsletter exports
//    POST only; un-exported methods must 405 (Next's route-handler
//    contract; wire-verified: 405 with NO Allow header on Next 16.4 — the
//    status is pinned, never the absent header).
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Trap #13 discipline: process.cwd()-based paths (the Playwright loader
// compiles TS as CJS; import.meta is unavailable).
const REPO = process.cwd();
const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
// L-2 doctrine: the seed IS the contract — the canonical PDP slug and its
// seeded integer-cents price (285000 = the $2,850.00 display pin).
const SEED_SLUG = "silk-draped-evening-gown";
// Spec-unique subscriber email — the cleanup key (never collides with the
// home UI test's newsletter@example.com or any canonical row).
const SPEC_EMAIL = "api-contract@example.com";

/** SQL fixture helper — the established `prisma db execute` pattern (H-24). */
function sqlRun(sql: string): void {
  const dir = mkdtempSync(path.join(os.tmpdir(), "api-contract-"));
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

/** Row-count read — prisma db execute cannot return rows; a tiny node -e
 * with the repo's own PrismaClient prints JSON to stdout. spawnSync with an
 * args ARRAY — no shell, so `$disconnect` survives intact (trap #34). */
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

test.describe("api contract (F-Y — the REST route handlers over the wire)", () => {
  test.afterAll(() => {
    sqlRun(`DELETE FROM "NewsletterSubscriber" WHERE email = '${SPEC_EMAIL}';`);
  });

  test("the health liveness envelope serves its documented shape", async ({
    request,
  }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    // The exact envelope — ok:true AND db:true (the E2E DB is seeded, so a
    // db:false here means the handler's DB wiring regressed, not the data).
    expect(await res.text()).toBe('{"ok":true,"db":true}');
  });

  test("the search typeahead's empty query takes the documented fast path", async ({
    request,
  }) => {
    const res = await request.get("/api/search");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true, results: [] });
  });

  test("a search hit carries the documented five-field DTO with the integer-cents price", async ({
    request,
  }) => {
    const res = await request.get("/api/search?q=silk");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      results: Array<Record<string, unknown>>;
    };
    expect(body.ok).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    const first = body.results[0];
    // The canonical catalog hit + the exact DTO shape (nothing more is
    // promised to the typeahead consumer).
    expect(first).toEqual({
      slug: SEED_SLUG,
      name: expect.any(String),
      brand: expect.any(String),
      image: expect.stringMatching(/^https?:\/\//) as unknown,
      price: expect.any(Number),
    });
    // The money invariant at the wire: integer cents, never a float.
    expect(Number.isInteger(first.price)).toBe(true);
  });

  test("a no-hit search degrades to 200 + an empty set (the F-12 best-effort contract)", async ({
    request,
  }) => {
    const res = await request.get("/api/search?q=zzzznothing9999");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true, results: [] });
  });

  test("the search limit parameter is clamped into the documented 1..10 band", async ({
    request,
  }) => {
    const lower = await request.get("/api/search?q=e&limit=1");
    expect(lower.status()).toBe(200);
    const lowerBody = (await lower.json()) as { results: unknown[] };
    expect(lowerBody.results).toHaveLength(1);

    const upper = await request.get("/api/search?q=e&limit=99");
    expect(upper.status()).toBe(200);
    const upperBody = (await upper.json()) as { results: unknown[] };
    expect(upperBody.results.length).toBeLessThanOrEqual(10);
    expect(upperBody.results.length).toBeGreaterThan(0);
  });

  test("the newsletter subscribe returns the documented success envelope", async ({
    request,
  }) => {
    const res = await request.post("/api/newsletter", {
      data: { email: SPEC_EMAIL },
    });
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
  });

  test("the newsletter subscribe is an idempotent upsert (one email, one row)", async ({
    request,
  }) => {
    // The row was minted by the previous case; the repeat must succeed AND
    // leave exactly one row (the update branch of the upsert).
    const res = await request.post("/api/newsletter", {
      data: { email: SPEC_EMAIL },
    });
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
    expect(
      dbRead(
        `(p)=>p.newsletterSubscriber.count({where:{email:"${SPEC_EMAIL}"}})`
      )
    ).toBe("1");
  });

  test("the newsletter subscribe rejects invalid input with the documented 400 envelopes", async ({
    request,
  }) => {
    const invalid = await request.post("/api/newsletter", {
      data: { email: "notanemail" },
    });
    expect(invalid.status()).toBe(400);
    const invalidBody = (await invalid.json()) as {
      ok: boolean;
      error?: unknown;
    };
    expect(invalidBody.ok).toBe(false);
    expect(typeof invalidBody.error).toBe("string");
    expect((invalidBody.error as string).length).toBeGreaterThan(0);

    const malformed = await request.post("/api/newsletter", {
      headers: { "content-type": "text/plain" },
      data: "garbage",
    });
    expect(malformed.status()).toBe(400);
    expect(((await malformed.json()) as { ok: boolean }).ok).toBe(false);
  });

  test("the method matrix: un-exported methods must not execute the handlers", async ({
    request,
  }) => {
    // Next 16.4 route handlers answer un-exported methods with 405 and NO
    // Allow header (wire-verified by the plan probe) — pin the status only.
    const postSearch = await request.post("/api/search", {
      data: { q: "silk" },
    });
    expect(postSearch.status()).toBe(405);

    const getNewsletter = await request.get("/api/newsletter");
    expect(getNewsletter.status()).toBe(405);

    const postHealth = await request.post("/api/health", {
      data: {},
    });
    expect(postHealth.status()).toBe(405);
  });
});
