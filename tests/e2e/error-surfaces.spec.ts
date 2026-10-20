// Failure-surfaces gate (session-23, F-I2 + the F-I spike made permanent).
//
// Two wire-reachable failure behaviors, both pre-existing and now PINNED:
//
// 1. The 404 card — src/app/not-found.tsx (the measured slate surface) is
//    what a bogus URL gets, with status 404 and a working "Go Home" escape.
//    Never pinned before; a refactor could have restyled it silently.
//
// 2. RSC-failure resilience — the session-23 spike (docs/remediation-plan-
//    session23.md §4) measured Next 16's behavior when an RSC payload fails
//    during client navigation: the router falls back to a HARD document
//    navigation, so the user still lands on the fully-rendered page and never
//    sees the raw failure body. This case pins that contract — if a future
//    Next upgrade surfaces dead ends (or the raw 500 body) instead, it goes
//    red. (The error BOUNDARY render itself is not wire-driveable without a
//    fault-injection backdoor in production code — rejected; error.tsx /
//    global-error.tsx are verified by the framework contract + typecheck.)
import { expect, test } from "@playwright/test";
import path from "node:path";

const PDP_PATH = "/product/silk-draped-evening-gown"; // the L-2 seed-contract slug

test.describe("failure surfaces (F-I2 + the RSC fallback contract)", () => {
  test("a bogus URL serves status 404 with the measured not-found card and a working escape", async ({
    page,
  }) => {
    const res = await page.goto("/definitely-not-a-route");
    expect(res?.status()).toBe(404);

    // The measured card: 404 numeral, the headline, the copy, the escape.
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    const goHome = page.getByRole("link", { name: "Go Home" });
    await expect(goHome).toBeVisible();

    // The escape actually escapes.
    await goHome.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("a failed RSC payload degrades to a hard navigation — the user lands on the real PDP", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load" });

    // Sink ONLY the flight payloads (rsc: 1) for the canonical PDP; document
    // requests fall through via fallback(). This is the spike's exact shape.
    const sunkPayloads: string[] = [];
    await page.route("**/product/silk-draped-evening-gown*", (route) => {
      if (route.request().headers()["rsc"] === "1") {
        sunkPayloads.push(route.request().url());
        return route.fulfill({ status: 500, contentType: "text/plain", body: "boom" });
      }
      return route.fallback();
    });

    await page.getByRole("link", { name: /silk draped evening gown/i }).first().click();

    // The hard-navigation fallback lands on the REAL page, fully rendered.
    await expect(page).toHaveURL(new RegExp(PDP_PATH.replace("/", "\\/")));
    await expect(
      page.getByRole("heading", { name: /silk draped evening gown/i }).first(),
    ).toBeVisible();
    // The raw failure body never renders.
    expect(sunkPayloads.length).toBeGreaterThan(0);
    await expect(page.getByText("boom")).toHaveCount(0);
    // And the page is functional, not an error shell: the buy panel speaks.
    // (The label's DOM text is "Size" — the uppercase is CSS text-transform,
    // so the pin matches case-insensitively.)
    await expect(page.getByText(/^size$/i)).toBeVisible();
  });
});

// F-TT half B (session-49): the inactive PDP's 404 + head-honesty contract.
// The round's fresh audit found generateMetadata reads the product WITHOUT
// the isActive check (product/[slug]/page.tsx:29-33) while the render 404s
// — the plan probe then MEASURED Next 16's behavior: notFound() discards
// the segment's generateMetadata wholesale, so the served head falls back to
// the root layout's identity and is byte-identical to a pure-404 control.
// That is PLATFORM behavior, not source behavior — a Next upgrade could
// silently start serving the hidden product's title/og:image/price over
// the 404 body. This pin makes that regression loud. No source fix needed;
// the fixture mints the hidden row (the seed ships every product active).
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

const REPO2 = process.cwd();
const SCHEMA2 = path.join(REPO2, "prisma", "schema.prisma");
const E2E_DB_URL2 = `file:${path.join(REPO2, "db", "e2e.db")}`;
const SQL_SCRATCH2 = path.join(REPO2, "tests", "e2e", ".ftt-404.sql");

function sqlRun2(sql: string): void {
  writeFileSync(SQL_SCRATCH2, sql);
  try {
    const res = spawnSync(
      "npx",
      ["prisma", "db", "execute", "--schema", SCHEMA2, "--file", SQL_SCRATCH2],
      {
        cwd: REPO2,
        env: { ...process.env, DATABASE_URL: E2E_DB_URL2 },
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      },
    );
    if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
  } finally {
    try { unlinkSync(SQL_SCRATCH2); } catch { /* already gone */ }
  }
}

test.describe("the inactive PDP's 404 + head honesty (F-TT half B, session-49)", () => {
  const SLUG = "ftt-404-e2e";
  const NAME = "F-TT 404 Probe";

  test.beforeAll(() => {
    sqlRun2(
      `DELETE FROM "Product" WHERE slug = '${SLUG}';\n` +
        `INSERT INTO "Product" ("id","slug","name","brand","description","price","categoryId","subcategory","sortOrder","stock","isActive","createdAt","updatedAt") ` +
        `SELECT 'ftt-probe-404','${SLUG}','${NAME}','Probe Atelier',` +
        `'A deactivated probe whose head must stay honest.',19900, ` +
        `(SELECT "id" FROM "Category" WHERE "slug"='accessories' LIMIT 1),'hats',999,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP;`,
    );
  });

  test.afterAll(() => {
    sqlRun2(`DELETE FROM "Product" WHERE slug = '${SLUG}';`);
  });

  /** Pull the head facts a scraper/crawler would read. */
  function headFacts(html: string): { title: string; ogImage: string; price: string } {
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "(none)";
    const ogImage = (html.match(/<meta[^>]+property="og:image"[^>]*>/i) ?? [])[0] ?? "(none)";
    const price = (html.match(/<meta[^>]+name="product:price:amount"[^>]*>/i) ?? [])[0] ?? "(none)";
    return { title: title.trim(), ogImage, price };
  }

  test("an INACTIVE product serves the 404 card — and its head is identical to a pure 404 (F-TT-B)", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1) The hidden row's PDP: status 404 + the root not-found card.
    const inactive = await page.goto(`/product/${SLUG}`);
    expect(inactive?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    const inactiveHead = headFacts(await page.content());

    // 2) The pure-404 control (an unknown slug): same card, same head.
    const unknown = await page.goto(`/product/${SLUG}-unknown-control`);
    expect(unknown?.status()).toBe(404);
    const unknownHead = headFacts(await page.content());

    // 3) The load-bearing assertion: the platform discarded the segment's
    //    generateMetadata on notFound() — the hidden product's identity
    //    (name, og:image, price) never reaches the head.
    expect(inactiveHead.title, "the title carries no product identity").toBe(unknownHead.title);
    expect(inactiveHead.ogImage, "og:image is the site root card, not the product's").toBe(unknownHead.ogImage);
    expect(inactiveHead.price, "no product:price meta over the 404").toBe(unknownHead.price);
    expect(inactiveHead.title).not.toContain(NAME);

    // 4) The not-dropped-meta guard: an ACTIVE PDP still serves its full
    //    head (the identity surfaces did not regress to a bare fallback).
    const active = await page.goto("/product/silk-draped-evening-gown");
    expect(active?.status()).toBe(200);
    const activeHead = headFacts(await page.content());
    expect(activeHead.title, "the active PDP's title carries the product").toContain("Silk Draped Evening Gown");
    expect(activeHead.price, "the active PDP's price meta serves").toContain("product:price:amount");
  });
});
