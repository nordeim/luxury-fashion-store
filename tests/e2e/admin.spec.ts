// Admin console — role gate (customer redirected), admin dashboard renders,
// REAL admin mutations (order update, product stock/visibility).
// ⚠️ H-52 (session-8) — the admin login budget is EXACTLY consumed: 5 admin
// logins in this spec × 2 projects = 10/10 per IP+email (SKILL §9 #23). ONE
// extra admin login anywhere in the suite 429s the last specs. Tests needing
// an admin-side state change use the `prisma db execute` SQL fixture pattern
// (H-2/H-39) — never a login. Failed attempts also consume the bucket.
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";
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
