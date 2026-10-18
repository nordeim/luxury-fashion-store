// Auth surfaces — logged-out login/register validation + rate-limit-aware
// happy path (single login; the limiter allows 10/IP/15 min and the setup
// project already spent one), the signed-in logout, the password
// rotation's session-revocation gate (F-II), and the profile save's
// write gate (F-JJ).
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const loggedOut = { storageState: { cookies: [], origins: [] } };

test.describe("auth (logged out)", () => {
  test.use(loggedOut);

  test("login page renders the measured card with demo hint", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("wrong credentials show the server error (no session)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("james@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Scoped: the Next route announcer also carries role=alert.
    await expect(page.locator("form").getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("register validates password confirmation", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("Name")).toBeVisible();
    await page.getByLabel("Name").fill("E2E User");
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
    await page.locator("#password").fill("Password123");
    await page.locator("#confirmPassword").fill("Different123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible({ timeout: 10_000 });
  });

  // Session 5, H-8: the register happy path was never exercised end-to-end
  // (only the mismatch error above). Pins the session + account landing.
  test("register creates an account and lands on /account (H-8)", async ({ page }) => {
    await page.goto("/register");
    const email = `e2e-reg-${Date.now()}@example.com`;
    await page.getByLabel("Name").fill("Register Flow");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill("Password123");
    await page.locator("#confirmPassword").fill("Password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();
    // A fresh account has no orders — the empty history renders guidance.
    await expect(page.getByText(/no orders|haven't placed/i).first()).toBeVisible();
  });
});

test.describe("logout (signed in)", () => {
  // H-24 (session-6): this test used to run on the setup project's
  // storageState — signing out destroyed that session's server row, so every
  // later spec in the project silently ran as guest (order-dependence the
  // file naming only happened to tolerate). The test now performs its OWN
  // throwaway login on a logged-out context: the canonical per-project
  // sessions survive the whole run. Rate budget: 5 logins/project/run < 10.
  test.use(loggedOut);

  test("account page shows session data, then logout clears it", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("james@example.com");
    await page.getByLabel("Password").fill("Demo1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();

    // Profile form (Radix tab content mounts on activation).
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.locator("#profile-name")).toHaveValue(/Whitmore/i);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    // Session destroyed: /account now bounces to the login page.
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });
});

// Password-rotation SESSION-REVOCATION gate (session-38, F-II).
//
// changePasswordAction (src/lib/actions/account.ts:54-61) rotates the hash
// AND then revokes every OTHER session — `db.session.deleteMany({ where:
// { userId, token: { not: keepToken } } })` — keeping the caller's own
// session so the user isn't logged out mid-flow. The F-4 comment
// (session-3) documents the exact regression class as having SHIPPED
// before: "a hijacked session previously survived the change". The
// session table IS the denylist (ADR-006), and the rotation is the moment
// that denylist gets exercised — yet NO gate ever verified it (the
// Settings-tab form is driven by zero specs; the action's write side and
// the revocation were never read back anywhere).
//
// ZERO logins, ZERO registers: the case rides the per-project
// storageState (james's setup session = the CURRENT session F-4 must
// KEEP) and mints the HIJACKED session OFFLINE (the a11y M-1/L-3 /
// F-HH pattern, first customer-side use — a random 256-bit token backed
// by a Session row inserted via `prisma db execute`; the cookie never
// needs to go on the wire — the plan probe wire-verified the mint's
// validity end-to-end, scripts/plan-probe-session38.cjs check 4). The
// exactly-consumed login buckets stay untouched; the register bucket
// stays 8 < 10 (the no-register shape).
//
// james is safe to mutate — with ONE scheduling fact handled explicitly:
// Playwright runs BOTH setup projects up-front (both are dependency-free,
// so setup-chromium AND setup-mobile complete before any spec runs), which
// means james holds the OTHER project's setup session row too when this
// case rotates — and F-4 lawfully revokes it (it IS another session). The
// finally therefore RESURRECTS any revoked setup-session rows by their
// storageState cookie tokens (insert-if-missing, idempotent) so the later
// project's specs keep their signed-in state — the same
// "finally restores the captured runtime state" discipline F-HH used,
// extended to session rows. The keep half is asserted BY TOKEN (the
// current context's own cookie → its row survives), NOT by count (the
// count is scheduling-dependent and was never the contract).
//
// The passwordHash is CAPTURED at case start (runtime value, never
// hardcoded) and restored byte-identically in the finally — every later
// james login (cart-merge ×2, security-csp ×2, both after auth.spec.ts
// alphabetically, workers:1 serial) sees Demo1234! again.
//
// The offline scrypt verification replicates verifyPassword
// (src/lib/auth.ts:47-54 — s1$salt$hex, scrypt keylen 64) without a
// login attempt: the write half (the hash actually rotated) is pinned
// alongside the revocation half. Trap #34: every helper passes ARGV
// arrays to spawnSync.
test.describe("password rotation (F-II, session-38)", () => {
  const HIJACK_TOKEN = randomBytes(32).toString("hex");
  const RUN = randomBytes(8).toString("hex"); // run-unique new-password marker

  const REPO = process.cwd();
  const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-ii-rotation.sql");

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

  /** The verifyPassword replication (s1$salt$hex, scrypt keylen 64) — proves
   *  a stored hash verifies a password WITHOUT a login attempt. */
  function verifyStoredHash(password: string): boolean {
    const script =
      `const {PrismaClient}=require("@prisma/client");const {scryptSync,timingSafeEqual}=require("node:crypto");` +
      `const p=new PrismaClient({datasources:{db:{url:"${E2E_DB_URL}"}}});` +
      `p.user.findUnique({where:{email:"james@example.com"},select:{passwordHash:true}}).then(u=>{` +
      `const parts=u.passwordHash.split("$");const expected=Buffer.from(parts[2],"hex");` +
      `const actual=scryptSync(${JSON.stringify(password)},parts[1],expected.length);` +
      `console.log("<<JSON>>"+JSON.stringify(expected.length===actual.length&&timingSafeEqual(expected,actual)));` +
      `return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
    const res = spawnSync("node", ["-e", script], {
      cwd: REPO,
      env: { ...process.env, DATABASE_URL: E2E_DB_URL },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    if (res.status !== 0) throw new Error(`verifyStoredHash failed: ${res.stderr?.slice(0, 300)}`);
    const marker = (res.stdout ?? "").indexOf("<<JSON>>");
    if (marker < 0) throw new Error(`verifyStoredHash produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
    return res.stdout.slice(marker + "<<JSON>>".length).trim() === "true";
  }

  test.beforeAll(() => {
    // The HIJACKED session: INSERT ... SELECT resolves james's id in the DB
    // itself (never hardcoded); idempotent delete-then-insert; the row dies
    // in the F-4 revocation itself (asserted) and belt-and-braces in
    // afterAll + every global-setup wipe.
    sqlRun(
      `DELETE FROM "Session" WHERE token = '${HIJACK_TOKEN}';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fii-james-' || '${HIJACK_TOKEN.slice(0, 16)}', '${HIJACK_TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';`,
    );
  });

  test.afterAll(() => {
    sqlRun(`DELETE FROM "Session" WHERE token = '${HIJACK_TOKEN}';`);
  });

  test("a rotation revokes every OTHER session and keeps the caller's (F-4, F-II)", async ({ page }) => {
    test.setTimeout(45_000);
    // Capture the runtime state — never hardcode (immune to drift; the
    // finally restores these exact bytes).
    const user = JSON.parse(
      dbRead(
        `(p)=>p.user.findUnique({where:{email:"james@example.com"},select:{passwordHash:true}})`,
      ),
    );
    if (!user) throw new Error("canonical fixture missing: james");
    const capturedHash = user.passwordHash as string;

    // The CURRENT session's token — parsed from this context's own cookie
    // (the storageState session F-4 must KEEP, asserted by token below).
    const sessionCookie = (await page.context().cookies()).find((c) => c.name === "aurelia_session");
    if (!sessionCookie) throw new Error("no aurelia_session cookie on the storageState context");
    const keepToken = sessionCookie.value.split(".")[0];

    // Restore the CAPTURED hash byte-identically + drop the minted row if
    // the revocation (or a mid-case failure) left it behind + resurrect
    // any setup-session row the rotation lawfully revoked (the OTHER
    // project's storageState — insert-if-missing, idempotent).
    const restore = () => {
      sqlRun(
        `UPDATE "User" SET "passwordHash"='${capturedHash}' WHERE "email"='james@example.com';\n` +
          `DELETE FROM "Session" WHERE token = '${HIJACK_TOKEN}';`,
      );
      for (const f of ["chromium.json", "mobile.json"]) {
        try {
          const raw = JSON.parse(
            readFileSync(path.join(REPO, "tests", "e2e", ".auth", f), "utf8"),
          ) as { cookies?: Array<{ name: string; value: string }> };
          const cookie = (raw.cookies ?? []).find((c) => c.name === "aurelia_session");
          const token = cookie?.value?.split(".")[0];
          if (token) {
            sqlRun(
              `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
                `SELECT 'fii-res-' || '${token.slice(0, 16)}', '${token}', id, datetime('now', '+1 day'), datetime('now') ` +
                `FROM "User" WHERE email = 'james@example.com' ` +
                `AND NOT EXISTS (SELECT 1 FROM "Session" WHERE token = '${token}');`,
            );
          }
        } catch {
          // an auth file absent/unreadable — its setup project owns it; skip
        }
      }
    };

    try {
      // The real form seam on the storageState session (the CURRENT session
      // F-4 must KEEP) — no login, no crafted POST.
      await page.goto("/account");
      await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();
      await page.getByRole("tab", { name: "Settings" }).click();

      const newPassword = `Roto${RUN}!A2b`;
      await page.locator("#current-password").fill("Demo1234!");
      await page.locator("#new-password").fill(newPassword);
      await page.locator("#confirm-password").fill(newPassword);
      await page.getByRole("button", { name: /update password/i }).click();
      await expect(page.getByRole("status")).toHaveText("Password changed.");

      // LOAD-BEARING — the F-4 REVOKE half: the hijacked session row is
      // GONE (server truth; the toast CANNOT see this).
      const hijackGone = JSON.parse(
        dbRead(`(p)=>p.session.findUnique({where:{token:"${HIJACK_TOKEN}"},select:{id:true}})`),
      );
      expect(hijackGone, "F-4 revoke half: the hijacked session row is gone").toBeNull();

      // LOAD-BEARING — the F-4 KEEP half by TOKEN: the CURRENT session's
      // row is STILL present (server truth — catches an over-broad
      // revocation that would log the caller out mid-flow).
      const keptRow = JSON.parse(
        dbRead(`(p)=>p.session.findUnique({where:{token:"${keepToken}"},select:{id:true}})`),
      );
      expect(keptRow, "F-4 keep half: the caller's session row survived").not.toBeNull();

      // The F-4 KEEP half — the CURRENT session still works on the wire
      // (a fresh render stays signed-in; a revoked storageState session
      // would bounce to /login).
      await page.goto("/account");
      await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();

      // LOAD-BEARING — the WRITE half, offline scrypt verification (the
      // verifyPassword replication): the stored hash now verifies the NEW
      // password and NO LONGER verifies the seed password.
      expect(verifyStoredHash(newPassword), "the stored hash verifies the new password").toBe(true);
      expect(verifyStoredHash("Demo1234!"), "the stored hash no longer verifies the old password").toBe(false);
    } finally {
      restore();
    }
  });
});

// F-JJ (session-39): the profile save's WRITE contract. The sibling seam of
// the F-II password rotation — updateProfileAction
// (src/lib/actions/account.ts:11-27) parses the name through the governed
// profileSchema (H-33, unit-pinned) and writes db.user.update; NO spec ever
// drove the Profile tab's name form (the only name-value assertion in the
// whole suite was the logout case's READ of the prefilled value at line 79),
// so a dropped (or no-op) write leaves the toast green ("Profile updated.")
// while the customer's name never changes — the toast-blind silent class.
// ZERO logins, ZERO registers, ZERO limiter consumption (updateProfileAction
// carries no limiter): the case rides the per-project storageState and the
// finally restores the CAPTURED name byte-identically. Trap #34: every helper
// passes ARGV arrays to spawnSync.
test.describe("profile update write (F-JJ, session-39)", () => {
  const RUN = randomBytes(8).toString("hex"); // run-unique name marker

  const REPO = process.cwd();
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-jj-profile.sql");

  /** Read rows through Prisma on the E2E DB (the F-II helper's shape). */
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

  /** SQL restore helper — the established `prisma db execute` pattern (H-2). */
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

  test("a profile save actually writes the name (F-JJ)", async ({ page }) => {
    test.setTimeout(45_000);
    // Capture the runtime state — never hardcode (immune to drift; the
    // finally restores these exact bytes).
    const user = JSON.parse(
      dbRead(
        `(p)=>p.user.findUnique({where:{email:"james@example.com"},select:{name:true,email:true}})`,
      ),
    );
    if (!user) throw new Error("canonical fixture missing: james");
    const capturedName = user.name as string;

    // SQL-escape the captured value for the restore statement (SQLite
    // doubles single quotes).
    const capturedNameSql = capturedName.replace(/'/g, "''");

    const newName = `James E2E Profile ${RUN}`;

    try {
      // The real form seam on the storageState session — no login, no
      // crafted POST.
      await page.goto("/account");
      await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();
      await page.getByRole("tab", { name: "Profile" }).click();

      await page.locator("#profile-name").fill(newName);
      await page.getByRole("button", { name: /save changes/i }).click();
      // SUPPORTING — the toast the mutation demo keeps green.
      await expect(page.getByRole("status")).toHaveText("Profile updated.");

      // LOAD-BEARING — the WRITE half: the User row's name IS the new name
      // (server truth; the toast CANNOT see this — a dropped write leaves
      // the toast green while the name never changes).
      const after = JSON.parse(
        dbRead(
          `(p)=>p.user.findUnique({where:{email:"james@example.com"},select:{name:true,email:true}})`,
        ),
      );
      expect(after.name, "F-JJ write half: the User row's name is the new name").toBe(newName);
      // The action writes name only — the email invariant.
      expect(after.email, "the email is untouched by the profile save").toBe("james@example.com");

      // The wire-real half — a fresh /account render prefills #profile-name
      // with the NEW name (the write landed; the form's defaultValue flows
      // from the server prop through the RSC render).
      await page.goto("/account");
      await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();
      await page.getByRole("tab", { name: "Profile" }).click();
      await expect(page.locator("#profile-name")).toHaveValue(newName);
    } finally {
      // Restore the CAPTURED name byte-identically — runs even on mid-case
      // failure; nothing probe-scoped survives (H-24; the seed upserts the
      // canonical name at every global-setup anyway).
      sqlRun(`UPDATE "User" SET name='${capturedNameSql}' WHERE "email"='james@example.com';`);
    }
  });
});
