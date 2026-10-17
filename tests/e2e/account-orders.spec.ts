// Account order-detail gate (session-33, F-DD).
//
// The account order-detail surface (/account/orders/[id]) had ZERO wire
// coverage — no test ever loaded it — yet it carries TWO declared contracts:
//
//   1. The F-16 privacy filter (session-3): the customer's Order Progress
//      timeline renders ONLY `actor !== "admin"` events. Admin-authored
//      OrderEvent rows (internal notes like "processing → in_transit" /
//      "DHL — TRK…") must never reach the customer body. Declared in FOUR
//      source places: the OrderEvent model header (prisma/schema.prisma),
//      the admin action's comment (src/lib/actions/admin.ts), the page's
//      own filter comment, and the seed's G-6/H-10 backfill comment. A
//      dropped filter leaks every internal admin note with every gate green.
//
//   2. The owner IDOR gate: `if (!order || order.userId !== user.id)
//      notFound();` — a signed-in customer opening another party's order
//      URL must get the platform not-found card. The canonical seed ships
//      the probe target: ORD-2026-004 is a GUEST order (userId: null), so
//      any signed-in customer fails the equality. A dropped check would
//      serve any order's full body — items, total, payment last-4, the
//      complete shipping address — to any signed-in customer.
//
// The admin MUTATION itself is wire-exercised (admin.spec.ts drives status/
// carrier updates with server-truth reload assertions); what was never
// asserted is the event minting's CUSTOMER-side visibility — the read side
// this spec pins. The admin-authored row is minted via the SQL fixture (the
// H-2/M-1 pattern) — never an extra admin login (the admin bucket stays
// exactly consumed, SKILL §9 #23).
//
// ZERO logins: both cases ride the per-project james storageState the setup
// projects minted — the limiter budget is untouched. The SQL insert
// self-cleans in a try/finally (H-24 discipline; global-setup wipes
// OrderEvent rows wholesale at every run start regardless).
//
// Trap #34 discipline: every helper passes ARGV arrays to spawnSync — no
// shell, no `$` expansion. Trap #38 discipline: event-type assertions use
// case-insensitive DOM-text regexes (the uppercase styling is CSS-only).
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-dd-event.sql");

/** Read rows through Prisma on the E2E DB (the action-seam helper's shape). */
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

/** SQL fixture helper — the established `prisma db execute` pattern (H-2/M-1). */
function sqlRun(sql: string): void {
  writeFileSync(SQL_SCRATCH, sql);
  try {
    const res = spawnSync(
      "npx",
      ["prisma", "db", "execute", "--schema", SCHEMA, "--file", SQL_SCRATCH],
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

function orderIdByNumber(number: string): string {
  const rows = JSON.parse(
    dbRead(`(p)=>p.order.findMany({where:{number:${JSON.stringify(number)}},select:{id:true,number:true,userId:true},take:1})`),
  );
  if (!rows.length) throw new Error(`canonical fixture missing: ${number}`);
  return rows[0].id as string;
}

test.describe("account order detail (F-DD, session-33)", () => {
  // Rides the per-project james storageState — ZERO logins, zero limiter
  // budget. The canonical seed IS the fixture (L-2 doctrine): james owns
  // ORD-2026-001/002/003; ORD-2026-004 is the canonical GUEST order
  // (userId: null) — the IDOR probe target.

  test("the customer timeline hides admin-authored events (F-16, session-33)", async ({ page }) => {
    test.setTimeout(30_000);
    const orderId = orderIdByNumber("ORD-2026-002");
    // A run-unique note so the cleanup can never touch anything else.
    const note = `INTERNAL E2E NOTE ${randomBytes(8).toString("hex")} — MUST NEVER RENDER`;
    // Mint the exact shape adminUpdateOrderAction writes on a status change:
    // actor:"admin" + the internal note (the model default is "system").
    sqlRun(
      `INSERT INTO "OrderEvent" ("id","orderId","type","note","actor","createdAt") ` +
        `VALUES ('fdd-' || lower(hex(randomblob(12))),'${orderId}','status_changed','${note}','admin',CURRENT_TIMESTAMP);`,
    );
    try {
      const res = await page.goto(`/account/orders/${orderId}`);
      expect(res?.status()).toBe(200);

      // The order identity + the timeline surface render for the owner.
      await expect(page.getByText("ORD-2026-002")).toBeVisible();
      await expect(page.getByText("Order Progress")).toBeVisible();

      // The seed's system events stay visible (DOM text — the page renders
      // e.type.replace("_", " "); the uppercase styling is CSS-only, #38).
      await expect(page.getByText(/^status changed$/i)).toBeVisible();
      await expect(page.getByText(/^tracking added$/i)).toBeVisible();

      // THE PIN: the admin-authored note is absent from the SERVED BODY —
      // the F-16 filter dropped it before render. A dropped filter would
      // leak every internal admin note to the customer.
      const body = await page.content();
      expect(body, "admin note leaked to the customer body").not.toContain(note);
    } finally {
      // Self-clean (H-24): the fixture row dies with the case, success or
      // failure (global-setup wipes the table regardless).
      sqlRun(`DELETE FROM "OrderEvent" WHERE "note" = '${note}';`);
    }
  });

  test("the owner gate rejects a foreign order (IDOR, session-33)", async ({ page }) => {
    test.setTimeout(30_000);
    // ORD-2026-004 is the canonical GUEST order (userId: null) — james's
    // session id fails the `order.userId !== user.id` equality.
    const guestOrderId = orderIdByNumber("ORD-2026-004");

    const res = await page.goto(`/account/orders/${guestOrderId}`);
    expect(res?.status(), "foreign order must 404").toBe(404);
    await expect(page.getByText("Page Not Found")).toBeVisible();

    // No existence leak: the served body must not carry the foreign order's
    // identity (the same "no existence leak" contract the F-CC matrix pins).
    const body = await page.content();
    expect(body, "foreign order number leaked").not.toContain("ORD-2026-004");
  });
});
