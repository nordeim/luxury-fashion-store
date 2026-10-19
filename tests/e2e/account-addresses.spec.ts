// Account addresses — session 5, H-4 + H-8: the address CRUD seam had NO
// coverage, and the edit prefill was structurally broken (uncontrolled
// defaultValue on already-mounted inputs — clicking Edit submitted stale
// fields). Pins: add → edit prefill (the H-4 regression) → change → persist
// → set default → delete. Runs on the demo customer's storage state.
//
// F-RR (session-47) — the address seam's IDOR walls: every address action
// guards cross-user access with `if (!existing || existing.userId !==
// user.id) return fail("That address no longer exists.")` (account.ts :91
// / :112 / :122), and NO gate ever exercised a foreign address — the UI
// describe above consumes only the caller's own ids, the account page
// renders only the caller's rows, and a dropped wall keeps every existing
// case green while any signed-in customer destroys / silently corrupts /
// exclusivity-corrupts ANOTHER user's address by id over the wire. The
// walls are pinned through the crafted-action protocol (the action-seam
// gate's JSON shape + the F-QQ multipart shape), authenticated by an
// offline-minted james session (F-NN's mint — ZERO logins, ZERO registers,
// ZERO limiter consumption: the address actions carry none), against a
// VICTIM address minted for the ADMIN user. The harm is server-truth-only
// (the foreign row never renders for the attacker), so every LB assertion
// reads the rows through Prisma — the wire envelope alone proves nothing.
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHmac, randomBytes } from "node:crypto";
import { E2E_AUTH_SECRET } from "./e2e-secrets";

test.describe("account addresses", () => {
  test("add, edit-prefill, update, set-default, delete (H-4/H-8)", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("tab", { name: "Addresses" }).click();
    const form = page.getByTestId("address-form");
    // A unique label scopes every card action (aria-labels are `Edit {label}`).
    const card = page.locator("div.border-border").filter({ hasText: "E2E HQ" }).filter({ has: page.getByText("E2E Recipient") });

    // 1) ADD — a fresh address appears in the list.
    await form.getByLabel("Label").fill("E2E HQ");
    await form.getByLabel("Full Name").fill("E2E Recipient");
    await form.getByLabel("Street").fill("9 Parity Lane");
    await form.getByLabel("City", { exact: true }).fill("Metz");
    await form.getByLabel("State").fill("FR");
    await form.getByLabel("ZIP").fill("57000");
    await form.getByRole("button", { name: /save address/i }).click();
    await expect(page.getByRole("status")).toHaveText("Address saved.");
    await expect(card.getByText("E2E Recipient")).toBeVisible();

    // 2) EDIT PREFILL (H-4) — clicking Edit must remount the form with the
    // address's values, NOT the previous mount's stale defaults.
    await card.getByRole("button", { name: "Edit E2E HQ" }).click();
    await expect(form.getByLabel("Full Name")).toHaveValue("E2E Recipient");
    await expect(form.getByLabel("Street")).toHaveValue("9 Parity Lane");
    await expect(form.getByLabel("City", { exact: true })).toHaveValue("Metz");
    await expect(form.getByLabel("State")).toHaveValue("FR");
    await expect(form.getByLabel("ZIP")).toHaveValue("57000");
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    // 3) UPDATE — change the street; the list reflects it after save.
    await form.getByLabel("Street").fill("13 Remounted Court");
    await form.getByRole("button", { name: /save address/i }).click();
    await expect(page.getByRole("status")).toHaveText("Address saved.");
    await expect(page.getByText("13 Remounted Court")).toBeVisible();

    // 4) SET DEFAULT — the badge moves to this address.
    await card.getByRole("button", { name: /set default/i }).click();
    await expect(card.getByText("Default")).toBeVisible();

    // 5) DELETE — the address disappears.
    await card.getByRole("button", { name: "Delete E2E HQ" }).click();
    await expect(page.getByText("13 Remounted Court")).not.toBeVisible({ timeout: 10_000 });
  });
});

test.describe("address IDOR walls (F-RR, session-47)", () => {
  // Request-level throughout (the F-PP/F-QQ/F-NN shape): Node fetch with
  // EXPLICIT Cookie headers — the projects' storageState never rides the
  // probes, and no browser surface is needed for the wire contract.
  const REPO = process.cwd(); // Trap #13: cwd-based paths (CJS loader).
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-rr-fixture.sql");
  const ACCOUNT_MANIFEST = path.join(
    REPO,
    ".next/standalone/.next/server/app/(storefront)/account/page/server-reference-manifest.json",
  );
  // Mirror the config's port resolution (a standalone request context
  // carries no baseURL — the action-seam gate's BASE_URL note).
  const BASE_URL = `http://localhost:${Number(process.env.E2E_PORT ?? 3100)}`;

  // Per-worker mint identity: each device project's worker mints its own
  // rows (delete-then-insert is idempotent; the serial topology keeps the
  // windows non-overlapping; afterAll cleans each worker's set).
  const SUFFIX = randomBytes(6).toString("hex");
  const TOKEN = `frr-${SUFFIX}-${randomBytes(24).toString("hex")}`;
  const SESSION_ID = `frr-sess-${SUFFIX}`;
  const VICTIM_ID = `frr-victim-${SUFFIX}`;
  const OWN_ID = `frr-own-${SUFFIX}`;
  const COOKIE = `${TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET).update(TOKEN).digest("base64url")}`;

  const SIGN_IN_MSG = "Sign in to manage your address book.";
  const NOT_YOURS_MSG = "That address no longer exists.";
  const VICTIM_STREET = "99 Untouchable Way";

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

  /** The action-seam gate's JSON-arg probe shape + the explicit auth cookie. */
  async function postJsonAction(
    actionId: string,
    payload: unknown[],
    cookie?: string,
  ): Promise<{ status: number; body: string }> {
    const res = await fetch(`${BASE_URL}/account`, {
      method: "POST",
      headers: {
        "Next-Action": actionId,
        "Content-Type": "text/plain;charset=UTF-8",
        ...(cookie ? { Cookie: `aurelia_session=${cookie}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    return { status: res.status, body: await res.text() };
  }

  /** The F-QQ multipart fetch-action shape for the (prev, formData) actions:
   * the `_1_*` fields MUST precede the flight row "0" = [null,"$K1"] (the
   * server's ordered referencedEntries walk breaks at the first
   * non-matching key — the session-46 probe's wire-order discovery). */
  async function postFormAction(
    actionId: string,
    fields: Record<string, string>,
    cookie?: string,
  ): Promise<{ status: number; body: string }> {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(`_1_${k}`, v);
    fd.set("0", '[null,"$K1"]');
    const res = await fetch(`${BASE_URL}/account`, {
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
    // The mint (F-NN's shape, idempotent delete-then-insert):
    // (a) james's session — FUTURE expiry (+1 day; the read's inline prune
    //     only fires on PAST-expiry rows), ZERO logins;
    // (b) the VICTIM address for the ADMIN user (INSERT..SELECT the userId —
    //     never hardcoded), isDefault FALSE;
    // (c) james's OWN control address.
    sqlRun(
      `DELETE FROM "Session" WHERE token = '${TOKEN}';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT '${SESSION_ID}', '${TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';\n` +
        `DELETE FROM "Address" WHERE id IN ('${VICTIM_ID}', '${OWN_ID}');\n` +
        `INSERT INTO "Address" ("id","userId","label","fullName","street","city","state","zip","country","isDefault") ` +
        `SELECT '${VICTIM_ID}', id, 'FRR Vault', 'Admin Victim', '${VICTIM_STREET}', 'Vault City', 'VC', '99999', 'United States', 0 ` +
        `FROM "User" WHERE email = 'admin@aurelia.com';\n` +
        `INSERT INTO "Address" ("id","userId","label","fullName","street","city","state","zip","country","isDefault") ` +
        `SELECT '${OWN_ID}', id, 'FRR Own', 'James Probe', '1 Own Lane', 'Own City', 'OC', '11111', 'United States', 0 ` +
        `FROM "User" WHERE email = 'james@example.com';`,
    );
  });

  test.afterAll(() => {
    // Idempotent prefix-scoped cleanup (the session row is also covered by
    // global-setup's session wipe — belt and braces).
    sqlRun(
      `DELETE FROM "Address" WHERE id IN ('${VICTIM_ID}', '${OWN_ID}');\n` +
        `DELETE FROM "Session" WHERE token = '${TOKEN}';`,
    );
  });

  test("the three address walls deny a foreign id over the wire; the own id writes (F-RR)", async () => {
    test.setTimeout(60_000);

    // --- the manifest canary (the build-shape gate) ---
    const manifest = JSON.parse(readFileSync(ACCOUNT_MANIFEST, "utf8")) as {
      node: Record<string, { exportedName?: string }>;
    };
    const entries = Object.entries(manifest.node ?? {});
    expect(entries.length, `manifest at ${ACCOUNT_MANIFEST}`).toBe(8);
    const byName = (name: string) =>
      entries.filter(([, v]) => v.exportedName === name).map(([id]) => id);
    for (const [id] of entries) expect(id).toMatch(/^[0-9a-f]{40,}$/);
    const deleteIds = byName("deleteAddressAction");
    const defaultIds = byName("setDefaultAddressAction");
    const saveIds = byName("saveAddressAction");
    expect(deleteIds, "exactly one deleteAddressAction").toHaveLength(1);
    expect(defaultIds, "exactly one setDefaultAddressAction").toHaveLength(1);
    expect(saveIds, "exactly one saveAddressAction").toHaveLength(1);
    const deleteId = deleteIds[0];
    const defaultId = defaultIds[0];
    const saveId = saveIds[0];

    // --- the auth wall (cookie-less crafted probes fail closed) ---
    for (const [label, id] of [
      ["delete", deleteId],
      ["setDefault", defaultId],
    ] as const) {
      const r = await postJsonAction(id, [VICTIM_ID]);
      expect(r.status, `${label}: action errors are envelopes, never 5xx`).toBe(200);
      expect(r.body).not.toContain("Internal Server Error");
      expect(r.body, `${label}: the auth wall fires first`).toContain(SIGN_IN_MSG);
    }

    // --- LB1: the IDOR walls (the VICTIM id, authenticated) ---
    const victimBefore = JSON.parse(
      dbRead(`(p)=>p.address.findUnique({where:{id:"${VICTIM_ID}"}})`),
    ) as { street: string; fullName: string; isDefault: boolean; label: string } | null;
    expect(victimBefore, "the victim row exists pre-ladder").toBeTruthy();

    // delete — JSON-arg shape
    const authDelete = await postJsonAction(deleteId, [VICTIM_ID], COOKIE);
    expect(authDelete.status).toBe(200);
    expect(authDelete.body, "the delete wall answers the owner envelope").toContain(NOT_YOURS_MSG);
    expect(authDelete.body).toContain('"ok":false');

    // setDefault — JSON-arg shape
    const authDefault = await postJsonAction(defaultId, [VICTIM_ID], COOKIE);
    expect(authDefault.status).toBe(200);
    expect(authDefault.body, "the setDefault wall answers the owner envelope").toContain(NOT_YOURS_MSG);
    expect(authDefault.body).toContain('"ok":false');

    // saveAddress edit — the F-QQ multipart shape (a VALID address payload;
    // Zod runs BEFORE the wall, so a valid payload is required to reach it)
    const hostileEdit = {
      label: "Hostile Edit",
      fullName: "Attacker Name",
      street: "1 Hijacked Street",
      city: "Hijack City",
      state: "HC",
      zip: "22222",
      country: "United States",
      id: VICTIM_ID,
    };
    const authEdit = await postFormAction(saveId, hostileEdit, COOKIE);
    expect(authEdit.status).toBe(200);
    expect(authEdit.body, "the saveAddress edit wall answers the owner envelope").toContain(NOT_YOURS_MSG);
    expect(authEdit.body).toContain('"ok":false');

    // Server-truth: the victim row survives the whole ladder byte-identical
    // (the wire envelope alone proves nothing — the harm class is
    // server-truth-only; a dropped wall shows up HERE, not in the UI).
    const victimAfter = JSON.parse(
      dbRead(`(p)=>p.address.findUnique({where:{id:"${VICTIM_ID}"}})`),
    ) as { street: string; fullName: string; isDefault: boolean; label: string } | null;
    expect(victimAfter, "the victim row SURVIVES the crafted delete").toBeTruthy();
    expect(victimAfter?.street).toBe(victimBefore?.street);
    expect(victimAfter?.fullName).toBe(victimBefore?.fullName);
    expect(victimAfter?.label).toBe(victimBefore?.label);
    expect(victimAfter?.isDefault, "the crafted setDefault never flipped the flag").toBe(false);

    // --- LB2: the controls (james's OWN minted address — the writes SUCCEED;
    // the false-positive guard: the denial above is the OWNER CHECK, not a
    // broken mint or a dead wire shape) ---
    const ownEdit = await postFormAction(
      saveId,
      { ...hostileEdit, id: OWN_ID, street: "2 Remounted Own Lane" },
      COOKIE,
    );
    expect(ownEdit.status).toBe(200);
    expect(ownEdit.body).toContain('"ok":true');
    const ownAfterEdit = JSON.parse(
      dbRead(`(p)=>p.address.findUnique({where:{id:"${OWN_ID}"},select:{street:true}})`),
    ) as { street: string } | null;
    expect(ownAfterEdit?.street, "the OWN edit wrote server-truth").toBe("2 Remounted Own Lane");

    const ownDelete = await postJsonAction(deleteId, [OWN_ID], COOKIE);
    expect(ownDelete.status).toBe(200);
    expect(ownDelete.body).toContain('"ok":true');
    const ownAfterDelete = JSON.parse(dbRead(`(p)=>p.address.findUnique({where:{id:"${OWN_ID}"}})`));
    expect(ownAfterDelete, "the OWN delete removed the row server-truth").toBeNull();

    // The setDefault control (re-create the own row first): the same wire
    // shape flips the OWN row's flag — proving the setDefault denial above
    // was the wall, not the protocol.
    sqlRun(
      `INSERT INTO "Address" ("id","userId","label","fullName","street","city","state","zip","country","isDefault") ` +
        `SELECT '${OWN_ID}', id, 'FRR Own', 'James Probe', '1 Own Lane', 'Own City', 'OC', '11111', 'United States', 0 ` +
        `FROM "User" WHERE email = 'james@example.com';`,
    );
    const ownDefault = await postJsonAction(defaultId, [OWN_ID], COOKIE);
    expect(ownDefault.status).toBe(200);
    expect(ownDefault.body).toContain('"ok":true');
    const ownAfterDefault = JSON.parse(
      dbRead(`(p)=>p.address.findUnique({where:{id:"${OWN_ID}"},select:{isDefault:true}})`),
    ) as { isDefault: boolean } | null;
    expect(ownAfterDefault?.isDefault, "the OWN setDefault flipped the flag").toBe(true);

    // --- the zero-victim-writes final delta ---
    const victimFinal = JSON.parse(
      dbRead(`(p)=>p.address.findUnique({where:{id:"${VICTIM_ID}"}})`),
    ) as { street: string; isDefault: boolean } | null;
    expect(victimFinal?.street).toBe(VICTIM_STREET);
    expect(victimFinal?.isDefault).toBe(false);
  });
});
