// Admin console — role gate (customer redirected), admin dashboard renders,
// REAL admin mutations (order update, product stock/visibility).
// ⚠️ H-52 (session-8) — the admin login budget is EXACTLY consumed: 5 admin
// logins in this spec × 2 projects = 10/10 per IP+email (SKILL §9 #23). ONE
// extra admin login anywhere in the suite 429s the last specs. Tests needing
// an admin-side state change use the `prisma db execute` SQL fixture pattern
// (H-2/H-39) — never a login. Failed attempts also consume the bucket.
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { E2E_AUTH_SECRET } from "./e2e-secrets";

test.describe("admin role gate (customer session)", () => {
  test("customers are redirected away from /admin", async ({ page }) => {
    // storageState = demo customer (role "user") from the setup project.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account/);
  });
});

test.describe("admin console (admin session)", () => {
  // The customer storageState would bounce /login → /account before the
  // admin credentials could ever be typed; start logged out.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("admin sign-in reaches the dashboard, orders, and products", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/account/);
    // Dashboard surfaces the role-gated metrics.
    await expect(page.getByText(/revenue|orders/i).first()).toBeVisible();
    // Regression pin (session 3, F-19 follow-up): the Products KPI must show the
    // full seeded catalog (12), not the low-stock-filtered count.
    const productsCard = page.getByText("Products", { exact: true }).locator("..");
    await expect(productsCard).toHaveText(/12/);
    // H-28 (session-6): KPI floors — deterministic because global-setup
    // restores the canonical 4 orders (H-25): Revenue ≥ $9,594.99 (285000 +
    // 340000 + 314000 + 20499 cents) and Orders ≥ 4. Real checkouts from the
    // other device project legitimately raise both, so these are floors, not
    // absolutes — the exact cancellation SEMANTICS are pinned in the H-2
    // injection test below (cancelled orders move Orders, never Revenue).
    const revenueCard = page.getByText("Revenue", { exact: true }).locator("..");
    const revenueValue = Number(((await revenueCard.textContent()) ?? "").replace(/[^0-9.]/g, ""));
    expect(revenueValue).toBeGreaterThanOrEqual(9594.99);
    const ordersCard = page.getByText("Orders", { exact: true }).locator("..");
    const ordersKpi = Number((await ordersCard.textContent())?.replace(/\D+/g, "") ?? "0");
    expect(ordersKpi).toBeGreaterThanOrEqual(4);

    await page.goto("/admin/orders");
    await expect(page.getByText(/ORD-\d{4}-\d{3}/).first()).toBeVisible();

    await page.goto("/admin/products");
    await expect(page.getByText(/silk/i).first()).toBeVisible();
  });

  // Session 4, G-1: the dashboard visit alone never caught the admin.ts
  // `status` ReferenceError — every mutation 500'd while all gates stayed
  // green. This spec performs a REAL mutation (status change, carrier set,
  // carrier clear) through the actual form seam.
  test("admin can update an order: status, carrier set, carrier clear", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/admin/orders");
    await page.getByRole("link", { name: /ORD-\d{4}-\d{3}/ }).first().click();
    await expect(page.getByText("Manage Order")).toBeVisible();

    // 1) Status transition (PLACED/DELIVERED → in_transit).
    await page.getByLabel("Status").selectOption("in_transit");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toHaveText("Order updated.");

    // 2) Carrier + tracking set — must survive a reload (server truth).
    await page.getByLabel("Carrier").fill("DHL");
    await page.getByLabel("Tracking Number").fill("1Z999AA10123456784");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toHaveText("Order updated.");
    await page.reload();
    await expect(page.getByLabel("Carrier")).toHaveValue("DHL");
    await expect(page.getByLabel("Tracking Number")).toHaveValue("1Z999AA10123456784");

    // 3) Carrier clear (F-9 semantics: empty string erases the field).
    await page.getByLabel("Carrier").fill("");
    await page.getByLabel("Tracking Number").fill("");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toHaveText("Order updated.");
    await page.reload();
    await expect(page.getByLabel("Carrier")).toHaveValue("");
    await expect(page.getByLabel("Tracking Number")).toHaveValue("");
  });

  // Session 5, H-2: the table header must show the server COUNT, not the
  // take-capped list length. The seed leaves the DB far below the take(100)
  // cap — where `.length` and COUNT agree — so this test INJECTS enough rows
  // to force divergence (104 total, 100 visible) and pins the header value.
  // Session 6, H-28: the injected rows are CANCELLED orders — the test also
  // pins the Revenue semantics (cancelled moves the Orders KPI by exactly
  // 104 while Revenue stays bit-identical).
  test("orders header reports the true total past the take cap (H-2)", async ({ page }) => {
    const e2eDb = path.resolve(process.cwd(), "db", "e2e.db");
    const schema = path.resolve(process.cwd(), "prisma", "schema.prisma");
    const inject = Array.from({ length: 104 }, (_, i) => {
      const n = String(i + 1).padStart(3, "0");
      return `INSERT INTO "Order" ("id","number","email","status","subtotal","shipping","total","shippingAddress","paymentMethod","placedAt","updatedAt") VALUES ('h2test${n}','ORD-9999-${n}','h2test@example.com','cancelled',100,0,100,'{}','cod',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`;
    }).join("\n");
    const sqlFile = path.resolve(process.cwd(), "tests", "e2e", ".h2-inject.sql");
    writeFileSync(sqlFile, inject);
    const env = { ...process.env, DATABASE_URL: `file:${e2eDb}` };
    const cleanup = () => {
      writeFileSync(sqlFile, `DELETE FROM "Order" WHERE "number" LIKE 'ORD-9999-%';`);
      execSync(`npx prisma db execute --schema ${schema} --file ${sqlFile}`, { env, stdio: "pipe" });
    };

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    try {
      // H-28 semantic pin: read both KPIs before the injection…
      const kpis = async () => {
        await page.goto("/admin");
        const revenue = await page.getByText("Revenue", { exact: true }).locator("..").textContent();
        const orderCount = await page.getByText("Orders", { exact: true }).locator("..").textContent();
        return { revenue: revenue?.trim() ?? "", orderCount: Number(orderCount?.replace(/\D+/g, "") ?? "0") };
      };
      const before = await kpis();

      execSync(`npx prisma db execute --schema ${schema} --file ${sqlFile}`, { env, stdio: "pipe" });
      await page.goto("/admin/orders");
      // take(100) caps the visible rows at 100; the header must read the
      // server COUNT (seeded orders + 104 injected), NOT orders.length.
      const total = await page.getByTestId("orders-total").textContent();
      expect(total?.trim()).toMatch(/1[0-9]{2} orders/); // >= 100+: three digits
      const visible = await page.getByRole("link", { name: /ORD-\d{4}-\d{3}/ }).count();
      expect(visible).toBe(100);
      expect(Number.parseInt(total?.replace(/\D+/g, "") ?? "0", 10)).toBeGreaterThan(visible);

      // …and after: Orders grew by exactly the 104 cancelled rows while
      // Revenue did not move a cent (cancelled ≠ revenue, H-28).
      // H-47 (session-7): bit-identical Revenue is deterministic ONLY because
      // the config pins fullyParallel:false + workers:1 — a parallel
      // non-cancelled checkout would move Revenue mid-injection.
      const during = await kpis();
      expect(during.orderCount - before.orderCount).toBe(104);
      expect(during.revenue).toBe(before.revenue);
    } finally {
      cleanup();
    }
  });

  // Session 5, H-7 + H-15 + H-6: the LAST untested mutation seam. Sets a
  // product's stock to 0 through the real admin form, then proves the
  // storefront honors it: the fresh PDP renders sold out, and a STALE PDP
  // (rendered pre-sellout, never reloaded) surfaces the action failure inline
  // instead of silently doing nothing. Restores stock (try/finally — shared DB).
  test("admin stock edit drives the storefront sellout path (H-7/H-15)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    const stockInput = page.getByLabel("Stock for Wide-Brim Felt Hat");
    const setBtn = stockInput.locator("..").getByRole("button", { name: "Set" });

    // STALE PDP FIRST: rendered while stock is still 12 (the seed value) and
    // kept open across the admin mutation (never reloaded) — a live React
    // island whose server truth moves under it.
    const stale = await page.context().newPage();
    await stale.goto("/product/wide-brim-felt-hat");
    const staleAdd = stale.locator("main").getByRole("button", { name: "Add to Bag" }).first();
    await expect(staleAdd).toBeEnabled();

    const pdp = await page.context().newPage();
    try {
      // Zero the stock through the admin form (row-scoped Set button).
      await page.goto("/admin/products");
      await stockInput.fill("0");
      await setBtn.click();
      await expect(page.getByRole("status")).toHaveText("Product updated.");

      // A FRESH PDP renders sold out (server truth reaches RSC)…
      await pdp.goto("/product/wide-brim-felt-hat");
      await expect(pdp.getByRole("button", { name: "Out of Stock" })).toBeDisabled();

      // …while the STALE page still shows an enabled button. Clicking it
      // must fail visibly (H-15 server guard + H-6 inline surfacing).
      await staleAdd.click();
      await expect(stale.getByTestId("pdp-action-error")).toHaveText(/out of stock/i);
      // The bag must not have grown: no drawer opened.
      await expect(stale.getByTestId("cart-drawer")).toHaveCount(0);
    } finally {
      // Restore stock (shared DB — later specs shop this product).
      await page.goto("/admin/products");
      await stockInput.fill("12");
      await setBtn.click();
      await expect(page.getByRole("status")).toHaveText("Product updated.");
      await stale.close();
      await pdp.close();
    }
  });

  // Session 5, H-7: visibility toggle drives /shop for real.
  test("admin visibility toggle hides and restores a product on /shop (H-7)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@aurelia.com");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Hide Wide-Brim Felt Hat" }).click();
    await expect(page.getByRole("button", { name: "Show Wide-Brim Felt Hat" })).toBeVisible();

    await page.goto("/shop");
    await expect(page.getByRole("main")).not.toContainText("Wide-Brim Felt Hat");

    // Restore.
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Show Wide-Brim Felt Hat" }).click();
    await expect(page.getByRole("button", { name: "Hide Wide-Brim Felt Hat" })).toBeVisible();
    await page.goto("/shop");
    await expect(page.getByRole("main")).toContainText("Wide-Brim Felt Hat");
  });
});

// Admin action EVENT-WRITE gate (session-37, F-HH).
//
// adminUpdateOrderAction mints OrderEvent rows INSIDE its H-29 transaction —
// a status transition writes `type:"status_changed"`, `actor:"admin"`,
// `note:"<old> → <new>"` (src/lib/actions/admin.ts:55, the F-16 stamp); a
// tracking change writes `type:"tracking_added"` with the G-11 joined
// carrier note (:78). The mutation case above drives the real form but
// asserts only the toast + form values — the minted ROWS were never read
// back; the F-DD gate pins the customer-side READ filter with a SQL-minted
// fixture, never the action's WRITE. A dropped tx.orderEvent.create (or a
// mangled actor/type/note) silently empties both timelines' deltas with
// every gate green — the toast still says "Order updated."
//
// ZERO logins: the admin session is minted OFFLINE (the a11y gate's M-1/L-3
// pattern) — a random 256-bit token, HMAC'd with the shared E2E_AUTH_SECRET,
// backed by a Session row inserted via `prisma db execute` — the exactly
// consumed admin bucket (SKILL §9 #23) stays untouched. The case rides the
// REAL form seam (status select + tracking input + Save) on the real
// session; dbRead is the LOAD-BEARING witness (server truth beyond the
// toast), the admin timeline render is SUPPORTING.
//
// ORD-2026-002 is the round's order (james's, seeded in_transit / DHL /
// 1Z8V4X209311 with 3 events): the mutation case above clicks the FIRST
// admin-orders link (placedAt desc → ORD-2026-004, the guest order), so
// this order keeps its seed shape when the describe runs — and the finally
// restores the CAPTURED runtime state regardless (shared-DB discipline;
// account-orders.spec.ts sorts before admin.spec.ts, and global-setup
// wipes Order/OrderEvent/Session wholesale at every run start, H-22/H-25).
// The baseline-id diff makes the event assertions collision-proof against
// the seed's own "processing → in_transit" note.
//
// Trap #34 discipline: every helper passes ARGV arrays to spawnSync. Trap
// #38: DOM-text assertions match the rendered note verbatim (the timeline
// styling is CSS-only).
test.describe("admin event-write path (F-HH, session-37)", () => {
  const ADMIN_TOKEN = randomBytes(32).toString("hex");
  const SESSION_COOKIE = `${ADMIN_TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET)
    .update(ADMIN_TOKEN)
    .digest("base64url")}`;
  const RUN = randomBytes(8).toString("hex"); // run-unique tracking marker

  test.use({
    storageState: {
      cookies: [
        {
          name: "aurelia_session",
          value: SESSION_COOKIE,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false, // http://localhost — matches the setup projects' minted cookies
          sameSite: "Lax" as const,
          expires: Math.floor(Date.now() / 1000) + 86_400,
        },
      ],
      origins: [],
    },
  });

  const REPO = process.cwd();
  const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-hh-event.sql");

  /** Read rows through Prisma on the E2E DB (the account-orders helper's shape). */
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

  test.beforeAll(() => {
    // INSERT ... SELECT: the seeded admin's id is resolved by the DB itself
    // (never hardcoded); idempotent delete-then-insert; the row dies in
    // afterAll AND at every global-setup wipe.
    sqlRun(
      `DELETE FROM "Session" WHERE token = '${ADMIN_TOKEN}';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fhh-admin-' || '${ADMIN_TOKEN}', '${ADMIN_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';`,
    );
  });

  test.afterAll(() => {
    sqlRun(`DELETE FROM "Session" WHERE token = '${ADMIN_TOKEN}';`);
  });

  test("status and tracking mutations mint OrderEvent rows server-side (F-HH)", async ({ page }) => {
    test.setTimeout(45_000);
    // Resolve the canonical order + its BASELINE (pre-case) event ids at
    // RUNTIME — never hardcode cuids (global-setup re-seeds every run).
    const order = JSON.parse(
      dbRead(
        `(p)=>p.order.findFirst({where:{number:"ORD-2026-002"},select:{id:true,status:true,carrier:true,trackingNumber:true,events:{select:{id:true},orderBy:{createdAt:"asc"}}}})`,
      ),
    );
    if (!order) throw new Error("canonical fixture missing: ORD-2026-002");
    const orderId = order.id as string;
    const baselineIds = new Set<string>(order.events.map((e: { id: string }) => e.id));
    expect(baselineIds.size, "the seed ships three events on ORD-2026-002").toBeGreaterThanOrEqual(3);
    const idList = Array.from(baselineIds).map((id) => `'${id}'`).join(",");

    // The minted-event witness: rows beyond the baseline id set.
    const newEvents = () => {
      const rows = JSON.parse(
        dbRead(
          `(p)=>p.orderEvent.findMany({where:{orderId:${JSON.stringify(orderId)}},select:{id:true,type:true,actor:true,note:true},orderBy:{createdAt:"asc"}})`,
        ),
      ) as Array<{ id: string; type: string; actor: string; note: string | null }>;
      return rows.filter((r) => !baselineIds.has(r.id));
    };

    // Restore the CAPTURED runtime state (immune to any earlier spec's
    // side effects) + drop exactly the rows this case minted.
    const restore = () => {
      sqlRun(
        `UPDATE "Order" SET status='${order.status}', carrier=${order.carrier === null ? "NULL" : `'${order.carrier}'`}, ` +
          `"trackingNumber"=${order.trackingNumber === null ? "NULL" : `'${order.trackingNumber}'`}, "updatedAt"=CURRENT_TIMESTAMP ` +
          `WHERE "id"='${orderId}';\n` +
          `DELETE FROM "OrderEvent" WHERE "orderId"='${orderId}' AND "id" NOT IN (${idList});`,
      );
    };

    try {
      // The real form seam on the offline-minted admin session (no login call).
      await page.goto(`/admin/orders/${orderId}`);
      await expect(page.getByText("Manage Order")).toBeVisible();

      // Leg A — status transition (seed: in_transit → processing) mints
      // EXACTLY ONE status_changed event with the F-16 admin stamp and the
      // "<old> → <new>" note.
      await page.getByLabel("Status").selectOption("processing");
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByRole("status")).toHaveText("Order updated.");

      let rows = newEvents();
      expect(rows.length, "leg A minted exactly one new event").toBe(1);
      expect(rows[0].type, "leg A event type").toBe("status_changed");
      expect(rows[0].actor, "leg A actor is the F-16 admin stamp").toBe("admin");
      expect(rows[0].note, "leg A note is the old → new transition").toBe(
        `${order.status} → processing`,
      );

      // SUPPORTING: the admin timeline (unfiltered) renders the minted note.
      // The reload also re-anchors the form on server truth for leg B.
      await page.reload();
      await expect(page.getByText(`${order.status} → processing`).first()).toBeVisible();

      // Leg B — tracking change (run-unique value) mints EXACTLY ONE
      // tracking_added event with the G-11 joined carrier note. The form
      // re-rendered on server truth (status select = processing = stored,
      // carrier prefilled = stored), so ONLY the tracking differs.
      const runTracking = `1ZFHH${RUN}`.toUpperCase();
      await page.getByLabel("Tracking Number").fill(runTracking);
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByRole("status")).toHaveText("Order updated.");

      rows = newEvents();
      expect(rows.length, "legs A+B minted exactly two new events").toBe(2);
      const trackingRow = rows.find((r) => r.type === "tracking_added");
      expect(trackingRow, "leg B minted a tracking_added row").toBeTruthy();
      expect(trackingRow?.actor, "leg B actor is the F-16 admin stamp").toBe("admin");
      expect(trackingRow?.note, "leg B note joins the carrier and tracking").toBe(
        `${order.carrier} — ${runTracking}`,
      );
      const statusRow = rows.find((r) => r.type === "status_changed");
      expect(statusRow?.note, "leg A's note still exact after leg B").toBe(
        `${order.status} → processing`,
      );
    } finally {
      restore();
    }
  });
});

// Low-stock KPI read gate (session-41, F-LL).
//
// The dashboard's Low Stock KPI reads the G-3 (session-4) dedicated COUNT —
// db.product.count({ where: { isActive: true, stock: { lte: 3 } } }) at
// src/app/(storefront)/admin/page.tsx:26 — whose own comment documents the
// F-21 under-count class ("lowStock.length would silently under-count"),
// and the alert panel below (:70-77) renders the low-stock names with the
// "3 or fewer remaining." copy. The canonical seed ships ALL 12 products at
// stock=12, so the surface renders its EMPTY state (KPI "0", panel hidden)
// on every run — and NO assertion anywhere reads either: the dashboard case
// above pins Products=12, Revenue floor, Orders floor (never Low Stock);
// the a11y spec renders the dashboard for axe violations only; the sibling
// H-2 seam (the take-cap class on the ORDERS table) got its injection gate
// in session-5 — G-3 never did. Every mutation of this read leaves every
// gate green: the count swapped for the take-capped list length (reads 20
// once 21 products sit at the threshold — the comment's own documented
// regression), the isActive filter dropped (the inactive sentinel counts),
// the threshold drifted (lt: 3 → 0, lte: 4 → over-count), the whole count
// dropped and hardcoded (0).
//
// ZERO logins: the admin session is minted OFFLINE (the F-HH/a11y M-1
// pattern) — the exactly-consumed admin bucket (SKILL §9 #23) stays
// untouched. The fixture: 21 active pins at stock=3 (the boundary value on
// the counted side — 21 > the panel list's take(20) forces the
// count-vs-length divergence the dedicated COUNT defends), one INACTIVE
// sentinel at stock=3 (the isActive-filter half), one active sentinel at
// stock=4 (the boundary+1 half). Cleanup in afterAll by slug prefix — the
// ONLY cleanup path: global-setup does NOT wipe Product (H-22/H-25 covers
// orders/carts/wishlists/sessions, not products).
test.describe("low-stock KPI read (F-LL, session-41)", () => {
  const ADMIN_TOKEN = randomBytes(32).toString("hex");
  const SESSION_COOKIE = `${ADMIN_TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET)
    .update(ADMIN_TOKEN)
    .digest("base64url")}`;
  const PREFIX = "f-ll-";
  const PIN_COUNT = 21;

  test.use({
    storageState: {
      cookies: [
        {
          name: "aurelia_session",
          value: SESSION_COOKIE,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false, // http://localhost — matches the setup projects' minted cookies
          sameSite: "Lax" as const,
          expires: Math.floor(Date.now() / 1000) + 86_400,
        },
      ],
      origins: [],
    },
  });

  const REPO = process.cwd();
  const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-ll-kpi.sql");

  /** Read rows through Prisma on the E2E DB (the F-HH helper's shape). */
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

  /** The fixture rows: N active pins (stock=3, the counted boundary) + the
   * inactive sentinel (stock=3, must NOT count) + the threshold sentinel
   * (stock=4, must NOT count). The categoryId resolves by scalar subquery —
   * never hardcoded; updatedAt passed explicitly (@updatedAt has no DB
   * default — the H-2 insert's discipline). */
  const fixtureSql = () => {
    const row = (slug: string, name: string, stock: number, isActive: boolean, sortOrder: number) =>
      `INSERT INTO "Product" ("id","slug","name","brand","description","price","categoryId","subcategory","sortOrder","stock","isActive","createdAt","updatedAt") ` +
      `VALUES ('${slug}','${slug}','${name}','E2E','F-LL fixture row',100,` +
      `(SELECT "id" FROM "Category" WHERE "slug"='accessories' LIMIT 1),'hats',${sortOrder},${stock},${isActive ? 1 : 0},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`;
    return [
      `DELETE FROM "Product" WHERE "slug" LIKE '${PREFIX}%';`,
      ...Array.from({ length: PIN_COUNT }, (_, i) =>
        row(`${PREFIX}pin-${String(i + 1).padStart(2, "0")}`, `F-LL Pin ${String(i + 1).padStart(2, "0")}`, 3, true, 1001 + i)),
      row(`${PREFIX}inactive-sentinel`, "F-LL Inactive Sentinel", 3, false, 1101),
      row(`${PREFIX}threshold-sentinel`, "F-LL Threshold Sentinel", 4, true, 1102),
    ].join("\n");
  };

  test.beforeAll(() => {
    // The offline admin mint (INSERT…SELECT resolves the admin's id in the
    // DB itself — never hardcoded; idempotent delete-then-insert; the row
    // dies in afterAll AND at every global-setup wipe).
    sqlRun(
      `DELETE FROM "Session" WHERE token = '${ADMIN_TOKEN}';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fll-admin-' || '${ADMIN_TOKEN.slice(0, 16)}', '${ADMIN_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';`,
    );
    sqlRun(fixtureSql());
  });

  test.afterAll(() => {
    // Product is NOT in global-setup's wipe list — this DELETE is the
    // fixture's ONLY cleanup path (runs even on mid-case failure).
    sqlRun(
      `DELETE FROM "Product" WHERE "slug" LIKE '${PREFIX}%';\n` +
        `DELETE FROM "Session" WHERE token = '${ADMIN_TOKEN}';`,
    );
  });

  test("the Low Stock KPI reads the true count, not the take-capped list (F-LL)", async ({ page }) => {
    test.setTimeout(45_000);

    // SUPPORTING — the fixture's own truth (server side, before any render).
    const fixtureRows = Number(dbRead(`(p)=>p.product.count({where:{slug:{startsWith:"${PREFIX}"}}})`));
    expect(fixtureRows, "the fixture landed: 21 pins + 2 sentinels").toBe(23);

    // The real surface on the offline-minted admin session (no login call).
    // The mint's wire validity: the role gate lets the dashboard render.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: /Admin/i })).toBeVisible();

    // LOAD-BEARING — the KPI reads the TRUE COUNT of active products at
    // stock <= 3: exactly the 21 pins. Catches every mutation shape: the
    // count swapped for lowStock.length (the take-20-capped list reads 20),
    // the isActive filter dropped (the inactive sentinel counts → 22), the
    // threshold drifted (lt: 3 → 0; lte: 4 → 22), the whole read dropped
    // (0). The existing dashboard case's KPI pins never read Low Stock —
    // this is the only assertion in the suite that does.
    const kpiCard = page.getByText("Low Stock", { exact: true }).locator("..");
    await expect(kpiCard).toBeVisible();
    const kpiText = (await kpiCard.textContent()) ?? "";
    const kpi = Number(kpiText.replace(/\D+/g, ""));
    expect(kpi, "the Low Stock KPI is the true COUNT (21 pins), not the list length (20), not unfiltered (22)").toBe(21);

    // SUPPORTING — the alert panel's read-through render: the threshold
    // copy + the sortOrder-first pin's name. (The panel's own take(20) cap
    // is deliberately NOT pinned — the KPI's true COUNT is the contract.)
    const panel = page.getByText("Low stock alert");
    await expect(panel).toBeVisible();
    await expect(panel.locator("..")).toContainText("3 or fewer remaining");
    await expect(panel.locator("..")).toContainText("F-LL Pin 01");
  });
});

// F-SS (session-48): the admin seam's role walls + field-validation gates.
// Every OTHER describe in this file drives the POSITIVE paths through an
// admin session (the canonical storageState or an offline mint) — no spec
// anywhere posts either admin action WITHOUT an admin session. A dropped
// `if (!admin) return fail("Admin access required.")` lets any signed-in
// customer flip order status + mint FORGED actor:"admin" OrderEvent rows
// into other users' customer-visible timelines (order-integrity +
// timeline-forgery class), zero/explode any product's stock, or
// isActive:false-hide any product (catalog sabotage) — with every existing
// case green. The /admin PAGE redirect guards the render, not the action
// dispatch (the proxy is CSP-only — verified). Wire-blindness proven by the
// mutation demos: all existing cases GREEN while exactly the 2 F-SS runs
// fail. Request-level throughout (the F-RR shape): Node fetch with explicit
// Cookie headers; the projects' storageState never rides the probes.
test.describe("admin seam role walls + field gates (F-SS, session-48)", () => {
  const REPO = process.cwd(); // Trap #13: cwd-based paths (CJS loader).
  const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-ss-fixture.sql");
  const PRODUCTS_MANIFEST = path.join(
    REPO,
    ".next/standalone/.next/server/app/(storefront)/admin/products/page/server-reference-manifest.json",
  );
  const ORDERS_MANIFEST = path.join(
    REPO,
    ".next/standalone/.next/server/app/(storefront)/admin/orders/page/server-reference-manifest.json",
  );
  // Mirror the config's port resolution (the F-RR BASE_URL note).
  const BASE_URL = `http://localhost:${Number(process.env.E2E_PORT ?? 3100)}`;

  // Per-worker mint identity (the F-RR pattern): each device project's
  // worker mints its own session rows (delete-then-insert is idempotent;
  // the serial topology keeps the windows non-overlapping).
  const SUFFIX = randomBytes(6).toString("hex");
  const CUST_TOKEN = `fss-cust-${SUFFIX}-${randomBytes(24).toString("hex")}`;
  const ADMIN_TOKEN = `fss-admin-${SUFFIX}-${randomBytes(24).toString("hex")}`;
  const CUST_COOKIE = `${CUST_TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET).update(CUST_TOKEN).digest("base64url")}`;
  const ADMIN_COOKIE = `${ADMIN_TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET).update(ADMIN_TOKEN).digest("base64url")}`;

  const ADMIN_REQUIRED_MSG = "Admin access required.";
  const FIELDS_MSG = "Check the highlighted fields.";
  const NO_PRODUCT_MSG = "That piece no longer exists.";
  const NO_ORDER_MSG = "That order no longer exists.";
  // The control product: a canonical seed product NO other stock-writing
  // spec touches (H-7 writes wide-brim-felt-hat; the checkout flows write
  // silk-draped-evening-gown / wide-brim-felt-hat; F-LL's pins are
  // slug-prefix-scoped and afterAll-deleted). Seed orders only READ it.
  const CONTROL_SLUG = "leather-crossbody-bag";
  const CONTROL_STOCK = 77;

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

  /** The F-QQ multipart fetch-action shape (both admin actions are
   * `(_prev, formData)` forms): the `_1_*` fields MUST precede the flight
   * row "0" = [null,"$K1"] (the session-46 wire-order discovery). */
  async function postFormAction(
    route: string,
    actionId: string,
    fields: Record<string, string>,
    cookie?: string,
  ): Promise<{ status: number; body: string }> {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(`_1_${k}`, v);
    fd.set("0", '[null,"$K1"]');
    const res = await fetch(`${BASE_URL}${route}`, {
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

  test.beforeAll(() => {
    // The mints (the F-NN/F-HH offline pattern, idempotent delete-then-
    // insert; INSERT..SELECT the userId by email — never hardcoded):
    // (a) james's CUSTOMER session — the hostile-craft caller, ZERO logins;
    // (b) the ADMIN session — the field-validation + control caller.
    sqlRun(
      `DELETE FROM "Session" WHERE token IN ('${CUST_TOKEN}', '${ADMIN_TOKEN}');\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fss-cust-${SUFFIX}', '${CUST_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fss-admin-${SUFFIX}', '${ADMIN_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';`,
    );
  });

  test.afterAll(() => {
    // Idempotent prefix-scoped cleanup (global-setup's session wipe is the
    // belt and braces for the session rows).
    sqlRun(`DELETE FROM "Session" WHERE token IN ('${CUST_TOKEN}', '${ADMIN_TOKEN}');`);
  });

  /** SQL string literal escape (the F-II/F-JJ restore precedent). */
  const sqlStr = (v: string | null): string =>
    v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`;

  test("the admin actions' role walls deny a customer's crafted wire calls; the field gates hold; the admin controls write (F-SS)", async () => {
    test.setTimeout(90_000);

    // --- the manifest canary (the build-shape gate) ---
    const prodEntries = Object.entries(
      (JSON.parse(readFileSync(PRODUCTS_MANIFEST, "utf8")) as {
        node: Record<string, { exportedName?: string }>;
      }).node ?? {},
    );
    const ordEntries = Object.entries(
      (JSON.parse(readFileSync(ORDERS_MANIFEST, "utf8")) as {
        node: Record<string, { exportedName?: string }>;
      }).node ?? {},
    );
    expect(prodEntries.length, `manifest at ${PRODUCTS_MANIFEST}`).toBe(3);
    expect(ordEntries.length, `manifest at ${ORDERS_MANIFEST}`).toBe(3);
    for (const [id] of [...prodEntries, ...ordEntries]) expect(id).toMatch(/^[0-9a-f]{40,}$/);
    const prodId = prodEntries.filter(([, v]) => v.exportedName === "adminUpdateProductAction").map(([id]) => id);
    const ordId = ordEntries.filter(([, v]) => v.exportedName === "adminUpdateOrderAction").map(([id]) => id);
    expect(prodId, "exactly one adminUpdateProductAction").toHaveLength(1);
    expect(ordId, "exactly one adminUpdateOrderAction").toHaveLength(1);
    const productAction = prodId[0];
    const orderAction = ordId[0];

    // --- runtime-resolved canonical targets (never hardcoded rowids) ---
    const product = JSON.parse(
      dbRead(`(p)=>p.product.findUnique({where:{slug:"${CONTROL_SLUG}"},select:{id:true,stock:true,isActive:true}})`),
    ) as { id: string; stock: number; isActive: boolean };
    const order = JSON.parse(
      dbRead(`(p)=>p.order.findFirst({orderBy:{placedAt:"asc"},select:{id:true,number:true,status:true}})`),
    ) as { id: string; number: string; status: string };
    expect(product?.id, "the control product exists").toBeTruthy();
    expect(order?.id, "the canonical order exists").toBeTruthy();
    const eventsBefore = Number(
      JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)),
    );
    // Capture the order's carrier/trackingNumber too — the demo hygiene
    // contract (F-HH): the finally restores every captured field regardless
    // of how the case ends.
    const orderSnapshot = JSON.parse(
      dbRead(`(p)=>p.order.findUnique({where:{id:"${order.id}"},select:{status:true,carrier:true,trackingNumber:true}})`),
    ) as { status: string; carrier: string | null; trackingNumber: string | null };
    // The hostile status must DIFFER from the current one — a dropped role
    // wall then flips the status AND mints a forged event (the full harm).
    const hostileStatus =
      order.status === "cancelled" ? "processing" : "cancelled";

    try {
      // --- the unauthenticated fail-closed half (cookie-less) ---
      for (const [label, route, id, fields] of [
        ["product", "/admin/products", productAction, { productId: product.id, stock: "1" }],
        ["order", "/admin/orders", orderAction, { orderId: order.id, status: hostileStatus }],
      ] as const) {
        const r = await postFormAction(route, id, fields);
        expect(r.status, `${label}: action errors are envelopes, never 5xx`).toBe(200);
        expect(r.body).not.toContain("Internal Server Error");
        expect(r.body, `${label}: the role wall fires first`).toContain(ADMIN_REQUIRED_MSG);
      }

      // --- LB1 (the role walls): the CUSTOMER session's hostile crafts ---
      const hostileProd = await postFormAction(
        "/admin/products",
        productAction,
        { productId: product.id, stock: "1" },
        CUST_COOKIE,
      );
      expect(hostileProd.status).toBe(200);
      expect(hostileProd.body, "the product role wall answers the admin envelope").toContain(ADMIN_REQUIRED_MSG);
      expect(hostileProd.body).toContain('"ok":false');
      const hostileOrd = await postFormAction(
        "/admin/orders",
        orderAction,
        { orderId: order.id, status: hostileStatus },
        CUST_COOKIE,
      );
      expect(hostileOrd.status).toBe(200);
      expect(hostileOrd.body, "the order role wall answers the admin envelope").toContain(ADMIN_REQUIRED_MSG);
      expect(hostileOrd.body).toContain('"ok":false');

      // Server-truth: both rows survive the hostile ladder byte-identical
      // (the harm class is server-truth-only — a dropped wall shows up
      // HERE, not in any UI).
      const prodAfterHostile = JSON.parse(
        dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true,isActive:true}})`),
      ) as { stock: number; isActive: boolean };
      const ordAfterHostile = JSON.parse(
        dbRead(`(p)=>p.order.findUnique({where:{id:"${order.id}"},select:{status:true,carrier:true,trackingNumber:true}})`),
      ) as { status: string; carrier: string | null; trackingNumber: string | null };
      expect(prodAfterHostile.stock, "the hostile product craft never wrote stock").toBe(product.stock);
      expect(prodAfterHostile.isActive, "the hostile product craft never flipped visibility").toBe(product.isActive);
      expect(ordAfterHostile.status, "the hostile order craft never flipped status").toBe(order.status);
      const eventsAfterHostile = Number(
        JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)),
      );
      expect(eventsAfterHostile, "the hostile order craft minted zero forged events").toBe(eventsBefore);

      // --- LB2 (the field/existence walls): the ADMIN session's invalid crafts ---
      for (const badStock of ["-1", "1000", "1.5", "abc"]) {
        const r = await postFormAction(
          "/admin/products",
          productAction,
          { productId: product.id, stock: badStock },
          ADMIN_COOKIE,
        );
        expect(r.status, `stock=${badStock}: envelopes, never 5xx`).toBe(200);
        expect(r.body, `stock=${badStock}: the Zod bounds reject it`).toContain(FIELDS_MSG);
        expect(r.body).toContain('"ok":false');
      }
      const badStatus = await postFormAction(
        "/admin/orders",
        orderAction,
        { orderId: order.id, status: "banana" },
        ADMIN_COOKIE,
      );
      expect(badStatus.status).toBe(200);
      expect(badStatus.body, "the status enum rejects a non-member").toContain(FIELDS_MSG);
      expect(badStatus.body).toContain('"ok":false');
      const noProduct = await postFormAction(
        "/admin/products",
        productAction,
        { productId: `fss-nonexistent-${SUFFIX}`, stock: "5" },
        ADMIN_COOKIE,
      );
      expect(noProduct.status).toBe(200);
      expect(noProduct.body, "the product existence wall answers").toContain(NO_PRODUCT_MSG);
      expect(noProduct.body).toContain('"ok":false');
      const noOrder = await postFormAction(
        "/admin/orders",
        orderAction,
        { orderId: `fss-nonexistent-${SUFFIX}` },
        ADMIN_COOKIE,
      );
      expect(noOrder.status).toBe(200);
      expect(noOrder.body, "the order existence wall answers").toContain(NO_ORDER_MSG);
      expect(noOrder.body).toContain('"ok":false');

      // Server-truth: the invalid ladder wrote nothing.
      const prodAfterBad = JSON.parse(
        dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true,isActive:true}})`),
      ) as { stock: number; isActive: boolean };
      expect(prodAfterBad.stock).toBe(product.stock);
      expect(prodAfterBad.isActive).toBe(product.isActive);
      const eventsAfterBad = Number(
        JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)),
      );
      expect(eventsAfterBad).toBe(eventsBefore);

      // --- LB3 (the controls — the false-positive guards): the ADMIN
      // session's LAWFUL crafts prove the mint + wire shape reach the DB;
      // the LB1/LB2 denials are the ROLE/ZOD walls, not a broken harness ---
      const controlProd = await postFormAction(
        "/admin/products",
        productAction,
        { productId: product.id, stock: String(CONTROL_STOCK) },
        ADMIN_COOKIE,
      );
      expect(controlProd.status).toBe(200);
      expect(controlProd.body).toContain('"ok":true');
      const prodAfterControl = JSON.parse(
        dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true}})`),
      ) as { stock: number };
      expect(prodAfterControl.stock, "the admin's lawful craft WROTE server-truth").toBe(CONTROL_STOCK);
      // The order action's ZERO-WRITE lawful shape: the CURRENT status →
      // the transaction writes nothing, no events minted.
      const controlOrd = await postFormAction(
        "/admin/orders",
        orderAction,
        { orderId: order.id, status: order.status },
        ADMIN_COOKIE,
      );
      expect(controlOrd.status).toBe(200);
      expect(controlOrd.body).toContain('"ok":true');
      const eventsAfterControl = Number(
        JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`)),
      );
      expect(eventsAfterControl, "the current-status control minted zero events").toBe(eventsBefore);
    } finally {
      // The shared-DB discipline (the H-7/F-HH try/finally patterns):
      // restore EVERY captured field byte-identically regardless of
      // outcome — the control product's stock, and the order's status +
      // any events minted beyond the baseline count (a mutation demo's
      // dropped wall writes here; the restore keeps the demo hygienic).
      sqlRun(`UPDATE "Product" SET stock = ${product.stock} WHERE id = '${product.id}';`);
      const excess =
        Number(JSON.parse(dbRead(`(p)=>p.orderEvent.count({where:{orderId:"${order.id}"}})`))) -
        eventsBefore;
      if (excess > 0) {
        sqlRun(
          `DELETE FROM "OrderEvent" WHERE rowid IN (SELECT rowid FROM "OrderEvent" WHERE "orderId" = '${order.id}' ORDER BY rowid DESC LIMIT ${excess});`,
        );
      }
      const carrierSql = sqlStr(orderSnapshot.carrier);
      const trackingSql = sqlStr(orderSnapshot.trackingNumber);
      sqlRun(
        `UPDATE "Order" SET status = '${orderSnapshot.status}', carrier = ${carrierSql}, "trackingNumber" = ${trackingSql} WHERE id = '${order.id}';`,
      );
    }

    // --- the final delta: the control product back byte-identical ---
    const prodFinal = JSON.parse(
      dbRead(`(p)=>p.product.findUnique({where:{id:"${product.id}"},select:{stock:true,isActive:true}})`),
    ) as { stock: number; isActive: boolean };
    expect(prodFinal.stock).toBe(product.stock);
    expect(prodFinal.isActive).toBe(product.isActive);
  });
});
