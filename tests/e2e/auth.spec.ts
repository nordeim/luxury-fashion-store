// Auth surfaces — logged-out login/register validation + rate-limit-aware
// happy path (single login; the limiter allows 10/IP/15 min and the setup
// project already spent one), the signed-in logout, the password
// rotation's session-revocation gate (F-II), the profile save's write gate
// (F-JJ), the logout's session-row revocation gate (F-KK), the TTL-revoke
// read gate (F-NN), and the auth limiter floors (F-PP).
import { expect, test } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { E2E_AUTH_SECRET } from "./e2e-secrets";

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

// Logout ROW-REVOCATION gate (session-40, F-KK).
//
// destroySession (src/lib/auth.ts:99-109) does TWO things: revokes the
// Session row — db.session.deleteMany({ where: { token } }) at :105 — and
// clears the cookie (:108). The session table IS the denylist (ADR-006,
// the auth.ts header says so verbatim), and logout is the user's canonical
// "kill my session" action: the exact moment a user who suspects a stolen
// cookie reaches for. Yet the existing logout case (above) asserts only
// what the wire can see — the redirect to / and the post-logout
// /account → /login bounce — and the bounce is driven by the COOKIE CLEAR
// ALONE: a dropped (or no-op'd) deleteMany leaves every existing assertion
// green while the Session row LINGERS with up to ~30 days of validity. A
// cookie value stolen BEFORE the logout (the same hijacker F-4's comment
// documents at the password seam, F-II pinned on the rotation) then
// SURVIVES the user's logout — the browser-side cookie clear does nothing
// to the copy in the attacker's jar, and the row it authenticates against
// stays alive.
//
// ZERO logins, ZERO registers, ZERO limiter consumption (logoutAction
// carries no limiter — verified by source read; only
// login/register/newsletter/checkout are rate-limited): the session under
// test is minted OFFLINE (the F-II hijack / F-HH admin / a11y M-1 family's
// second customer-side use — a random 256-bit token, the cookie signed
// token.hmac with the shared E2E_AUTH_SECRET, the row inserted via
// `prisma db execute` with james's id resolved by the DB itself). The
// describe's storageState carries ONLY the minted cookie — the project's
// setup session is never ridden, never destroyed (the H-24 trap the
// original logout case documents). The mint is exactly the no-register /
// no-login shape the session-39 plan §8 #16 prefers.
//
// Cleanup discipline (H-24): the afterAll belt-and-braces DELETE is a
// no-op on a healthy logout (probe check 10) and runs even on mid-case
// failure; global-setup wipes the Session table wholesale at every run
// start anyway (H-22/H-25). Trap #34: every helper passes ARGV arrays to
// spawnSync.
test.describe("logout row revocation (F-KK, session-40)", () => {
  const TOKEN = randomBytes(32).toString("hex");
  const mintedStorageState = {
    cookies: [
      {
        name: "aurelia_session",
        value: `${TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET).update(TOKEN).digest("base64url")}`,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false, // http://localhost — matches the setup projects' minted cookies
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 86_400,
      },
    ],
    origins: [],
  };

  test.use({ storageState: mintedStorageState });

  const REPO = process.cwd();
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-kk-logout.sql");

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

  test.beforeAll(() => {
    // The minted session: INSERT ... SELECT resolves james's id in the DB
    // itself (never hardcoded); idempotent delete-then-insert; the row dies
    // in the logout's revocation itself (asserted) and belt-and-braces in
    // afterAll + every global-setup wipe.
    sqlRun(
      `DELETE FROM "Session" WHERE token = '${TOKEN}';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fkk-james-' || '${TOKEN.slice(0, 16)}', '${TOKEN}', id, datetime('now', '+1 day'), datetime('now') ` +
        `FROM "User" WHERE email = 'james@example.com';`,
    );
  });

  test.afterAll(() => {
    // Belt-and-braces (a no-op on a healthy logout — probe check 10): the
    // minted row dies with the group even on mid-case failure.
    sqlRun(`DELETE FROM "Session" WHERE token = '${TOKEN}';`);
  });

  test("a logout revokes the session ROW, not just the cookie (F-KK)", async ({ page }) => {
    test.setTimeout(45_000);

    // Precondition — the minted row exists (belt; beforeAll inserted it).
    const minted = JSON.parse(
      dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`),
    );
    expect(minted, "the minted session row exists before the logout").not.toBeNull();

    // SUPPORTING — the mint's WIRE VALIDITY: the cookie + row render
    // /account signed-in (a fresh context carrying the minted cookie is
    // indistinguishable from a logged-in james — the attacker's-eye view
    // of a stolen cookie).
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /My Account/i })).toBeVisible();

    // The REAL logout seam — the account-tabs form drives logoutAction.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    // LOAD-BEARING — the REVOKE half: the minted Session row is GONE
    // (server truth; the wire CANNOT see this — the exact assertion the
    // existing logout case cannot make. A dropped deleteMany leaves this
    // row alive up to ~30d while every URL-level assertion stays green).
    const revoked = JSON.parse(
      dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`),
    );
    expect(revoked, "F-KK revoke half: the session row is revoked by the logout").toBeNull();

    // SUPPORTING — the wire half (the cookie-clear side, the half the
    // existing logout case already pins): a fresh /account fetch bounces
    // to /login. Re-asserted here so a BOTH-halves-dropped regression
    // fails visibly in this case too.
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
    // And the cookie itself is gone from the context.
    const sessionCookie = (await page.context().cookies()).find((c) => c.name === "aurelia_session");
    expect(sessionCookie, "the aurelia_session cookie is cleared").toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F-NN (session-43) — the expired-session denial: the TTL revoke half of the
// ADR-006 session denylist. The denylist's three revoke halves: logout
// (F-KK gated), rotation (F-II gated) — and TTL EXPIRY, gated by NOTHING
// before this round. getCurrentUser (src/lib/auth.ts:132-135) is the
// read-time enforcement: an expired-but-present session row must (1) NOT
// authenticate its bearer (the expiry check — a dropped check opens a
// zombie-auth window up to the next hourly sweep on a long-running server;
// the stolen-cookie threat model F-KK documents) and (2) be PRUNED by the
// read itself (the :133 inline delete — a dropped prune leaves dead rows
// lingering while every wire-level assertion stays green; the sweeper's own
// comment documents the contract: "the auth layer also deletes lazily on
// presentation").
//
// Wire-blindness (first-hand census, this session): ALL five offline-mint
// sites in the suite mint FUTURE expiry (F-II's hijack + resurrect, F-KK,
// F-HH admin, the a11y M-1 axe gate — every one `datetime('now', '+1
// day')`); every login-minted session is +30d (SESSION_TTL_DAYS); the
// sweeper unit test pins the PLAN shape only, never the runtime seam. A
// dropped check leaves every existing gate green while the expired cookie
// keeps authenticating through the window.
//
// ZERO logins, ZERO registers, ZERO limiter consumption (the F-KK shape):
// the session under test is minted OFFLINE — a random 256-bit token, the
// cookie signed token.hmac with the shared E2E_AUTH_SECRET, the row
// inserted via `prisma db execute` with james's id resolved by the DB
// itself. The describe's storageState carries ONLY the minted cookie (the
// browser-cookie expiry is FUTURE +1d — the browser must CARRY the cookie;
// the ROW's expiry is the seam under test: PAST, -1d). The mint is exactly
// the no-register/no-login shape the session-39 plan §8 #16 prefers.
//
// Cleanup discipline (H-24): the afterAll belt-and-braces DELETE is a
// no-op on a healthy prune (probe check 5) and runs even on mid-case
// failure; global-setup wipes the Session table wholesale at every run
// start anyway (H-22/H-25). The sweeper runs at boot + hourly — never
// inside a 6-minute suite run, and the row is inserted after boot, so the
// prune assertion can only fire through getCurrentUser's inline delete.
// Trap #34: every helper passes ARGV arrays to spawnSync.
test.describe("expired session denial (F-NN, session-43)", () => {
  const TOKEN = randomBytes(32).toString("hex");
  const mintedStorageState = {
    cookies: [
      {
        name: "aurelia_session",
        value: `${TOKEN}.${createHmac("sha256", E2E_AUTH_SECRET).update(TOKEN).digest("base64url")}`,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false, // http://localhost — matches the setup projects' minted cookies
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 86_400, // the BROWSER keeps the cookie; the ROW is expired
      },
    ],
    origins: [],
  };

  test.use({ storageState: mintedStorageState });

  const REPO = process.cwd();
  const E2E_DB_URL = `file:${path.join(REPO, "db", "e2e.db")}`;
  const SQL_SCRATCH = path.join(REPO, "tests", "e2e", ".f-nn-expired.sql");

  /** Read rows through Prisma on the E2E DB (the F-II/F-KK helper's shape). */
  function dbRead(jsonExpression: string): string {
    const script = `const {PrismaClient}=require("@prisma/client");const p=new PrismaClient({datasources:{db:{url:"${E2E_DB_URL}"}}});(${jsonExpression})(p).then(r=>{console.log("<<JSON>>"+JSON.stringify(r));return p.$disconnect()}).catch(e=>{console.error(e.message);process.exit(1)})`;
    const res = spawnSync("node", ["-e", script], {
      cwd: REPO,
      env: { ...process.env, DATABASE_URL: E2E_DB_URL },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
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
          encoding: "utf-8",
        },
      );
      if (res.status !== 0) throw new Error(`sqlRun failed: ${res.stderr?.slice(0, 300)}`);
    } finally {
      try { unlinkSync(SQL_SCRATCH); } catch { /* already gone */ }
    }
  }

  test.beforeAll(() => {
    // The EXPIRED session: INSERT ... SELECT resolves james's id in the DB
    // itself (never hardcoded); expiresAt = datetime('now', '-1 day') —
    // PAST (the seam under test; every other mint in the suite is FUTURE);
    // idempotent delete-then-insert; the row dies in the read's own prune
    // (asserted) and belt-and-braces in afterAll + every global-setup wipe.
    sqlRun(
      `DELETE FROM "Session" WHERE token = '${TOKEN}';\n` +
        `INSERT INTO "Session" (id, token, "userId", "expiresAt", "createdAt") ` +
        `SELECT 'fnn-james-' || '${TOKEN.slice(0, 16)}', '${TOKEN}', id, datetime('now', '-1 day'), datetime('now', '-2 day') ` +
        `FROM "User" WHERE email = 'james@example.com';`,
    );
  });

  test.afterAll(() => {
    // Belt-and-braces (a no-op on a healthy prune — probe check 5): the
    // minted row dies with the group even on mid-case failure.
    sqlRun(`DELETE FROM "Session" WHERE token = '${TOKEN}';`);
  });

  test("an expired session no longer authenticates — the TTL revoke + inline prune (F-NN)", async ({ page }) => {
    test.setTimeout(45_000);

    // Precondition — the minted EXPIRED row exists (belt; beforeAll
    // inserted it). The read also proves the row-shape sanity: present but
    // past its expiry.
    const minted = JSON.parse(
      dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true,expiresAt:true}})`),
    );
    expect(minted, "the minted EXPIRED session row exists before the read").not.toBeNull();
    expect(new Date(minted.expiresAt).getTime(), "the row's expiry is in the PAST").toBeLessThan(Date.now());

    // LOAD-BEARING 1 (the wire denial — the TTL revoke): /account bounces
    // to /login — getCurrentUser returned null through the expiry branch.
    // A dropped expiry check leaves this page SIGNED-IN (the zombie-auth
    // window) and this assertion red while every existing gate stays green
    // (all their sessions are future-expiry).
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount|\/login\?redirect=\/account/);

    // LOAD-BEARING 2 (server truth — the inline prune): the expired row is
    // GONE after the read (auth.ts:133's delete — the wire CANNOT see
    // this). A dropped prune leaves the row lingering until the hourly
    // sweeper while the wire denial above stays green — the exact
    // silent-lingering class F-KK pinned at the logout seam.
    const pruned = JSON.parse(
      dbRead(`(p)=>p.session.findUnique({where:{token:"${TOKEN}"},select:{id:true}})`),
    );
    expect(pruned, "F-NN prune half: the expired row is deleted by the read itself").toBeNull();
  });
});

// F-PP (session-45) — the auth limiter floors over the wire. Both auth
// mutation seams carry the same abuse floor (auth.ts: loginAction's
// `rateLimit("login:"+ip+":"+email, 10, 15min)`, registerAction's
// `rateLimit("register:"+ip, 10, 15min)`): the 11th same-key attempt must
// answer `fail("Too many attempts. Try again in N seconds.")`. Ungated
// since the limiter's introduction — every existing login/register consume
// in the suite is lawful and far under 10, so a dropped `if (!limiter.allowed)`
// block rides every burst through with all gates green (the brute-force /
// bulk-register silent-abuse class F-OO closed for /api/search).
//
// The F-OO harness insight, applied to the auth seam: the burst never
// touches the shared suite server. The case spawns the SAME standalone
// artifact as a THROWAWAY process on :3212 against a THROWAWAY COPY of
// db/e2e.db (the auth actions need working DB reads — the login's user
// lookup and the register's existing-check must answer envelopes, not raw
// 500s). The isolated process owns its own module-scope limiter buckets
// (rate-limit.ts), so the 11+11 burst consumes ZERO of :3100's buckets —
// the exact pollution that kept these floors carried since session-29.
//
// The wire shape (React 19 progressive enhancement, measured in the
// session-45 probe): the SSR'd form renders `$ACTION_REF_1`, `$ACTION_1:0`
// = {"id":"<hex>","bound":"$@1"}, `$ACTION_1:1` = "[null]" (the bound
// prev-state) and `$ACTION_KEY` — a multipart POST carrying those plus the
// form's own fields invokes the action server-side exactly as a browser
// without JS does. The login/register manifests expose TWO ids (both
// pages import both actions via the shared auth-form); the gate
// discriminates them by response envelope.
//
// ZERO logins, ZERO registers, ZERO limiter consumption on the MAIN server;
// zero DB writes anywhere (the login burst is an unknown email — no
// session rows; the register burst is an existing email — no user rows; the
// throwaway copy is deleted with its tmpdir).
test.describe("auth limiter floors (F-PP, session-45)", () => {
  const FPP_PORT = 3212;
  const FPP_BASE = `http://localhost:${FPP_PORT}`;
  const REPO = process.cwd();
  const STANDALONE = path.join(REPO, ".next", "standalone", "server.js");
  const LOGIN_MANIFEST = path.join(
    REPO,
    ".next/standalone/.next/server/app/(auth)/login/page/server-reference-manifest.json",
  );
  const E2E_DB_FILE = path.join(REPO, "db", "e2e.db");

  const BURST_EMAIL = "fpp-unknown@example.com";
  const OTHER_EMAIL = "fpp-other@example.com";
  const EXISTING_EMAIL = "james@example.com"; // exists on the copy (the seed)
  const PASSWORD = "WrongPassword1234!"; // valid shape for both schemas

  const ENUMERATION_MSG = "Incorrect email or password.";
  const EXISTS_MSG = "An account with this email already exists.";
  const ZOD_COPY = "Check the highlighted fields";
  const FLOOR_RE = /Too many attempts\. Try again in (\d+) seconds/;

  /** The no-JS progressive-enhancement POST (the probe's measured shape). */
  async function postForm(
    pagePath: string,
    actionId: string,
    fields: Record<string, string>,
  ): Promise<{ status: number; body: string }> {
    const fd = new FormData();
    fd.set("$ACTION_REF_1", "");
    fd.set("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
    fd.set("$ACTION_1:1", "[null]");
    fd.set("$ACTION_KEY", `kfpp${process.pid.toString(16)}${Date.now().toString(16)}`);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(`${FPP_BASE}${pagePath}`, { method: "POST", body: fd, signal: ctrl.signal });
      return { status: res.status, body: await res.text() };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Read a count through Prisma on the THROWAWAY copy (dbRead's shape). */
  function copyUserCount(copyUrl: string): number {
    const script =
      `const {PrismaClient}=require("@prisma/client");` +
      `const p=new PrismaClient({datasources:{db:{url:"${copyUrl}"}}});` +
      `p.user.count().then(c=>{console.log("<<JSON>>"+c);return p.$disconnect()})` +
      `.catch(e=>{console.error(e.message);process.exit(1)})`;
    const res = spawnSync("node", ["-e", script], {
      cwd: REPO,
      env: { ...process.env, DATABASE_URL: copyUrl },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    if (res.status !== 0) throw new Error(`copyUserCount failed: ${res.stderr?.slice(0, 300)}`);
    const marker = (res.stdout ?? "").indexOf("<<JSON>>");
    if (marker < 0) throw new Error(`copyUserCount produced no JSON: ${(res.stdout ?? "").slice(0, 200)}`);
    return Number(res.stdout.slice(marker + "<<JSON>>".length).trim());
  }

  test("the 11th same-key attempt on either auth action answers the limiter floor (F-PP)", async () => {
    test.setTimeout(60_000);

    // The throwaway: a tmpdir holding a COPY of the suite DB + the
    // standalone on :3212 with its own fresh limiter buckets.
    const tmp = mkdtempSync(path.join(os.tmpdir(), "aurelia-fpp-"));
    const copyPath = path.join(tmp, "copy.db");
    copyFileSync(E2E_DB_FILE, copyPath);
    const copyUrl = `file:${copyPath}`;
    const usersBefore = copyUserCount(copyUrl);

    let child: ReturnType<typeof spawn> | null = null;
    try {
      child = spawn("node", [STANDALONE], {
        cwd: REPO,
        env: {
          ...process.env,
          PORT: String(FPP_PORT),
          NODE_ENV: "production",
          AUTH_SECRET: E2E_AUTH_SECRET,
          DATABASE_URL: copyUrl,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderrTail = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString("utf8")).slice(-800);
      });

      // Boot + listen (the load-bearing feasibility check).
      const deadline = Date.now() + 25_000;
      let booted = false;
      while (Date.now() < deadline) {
        try {
          const probe = await fetch(`${FPP_BASE}/api/health`);
          const text = await probe.text();
          if (probe.status === 200 && text.includes('"db":true')) {
            booted = true;
            break;
          }
        } catch { /* not listening yet */ }
        await new Promise((r) => setTimeout(r, 300));
      }
      expect(booted, `throwaway must boot against the copy; stderr: ${stderrTail.slice(0, 300)}`).toBe(true);

      // The authoritative id set (the build-shape canary: a Next.js
      // upgrade that reshapes the manifest fails HERE, loudly).
      const manifest = JSON.parse(readFileSync(LOGIN_MANIFEST, "utf8")) as { node?: Record<string, unknown> };
      const ids = Object.keys(manifest.node ?? {});
      expect(ids, `manifest at ${LOGIN_MANIFEST}`).toHaveLength(2);
      for (const id of ids) expect(id).toMatch(/^[0-9a-f]{40,}$/);

      // Discriminate: the login shape (unknown email) → the
      // anti-enumeration envelope identifies loginAction; the same shape
      // against the sibling fails registerSchema's Zod gate BEFORE its
      // limiter (confirmPassword absent) — zero register-bucket
      // consumption. The loginAction probe IS login burst iteration 1
      // (the bucket key includes the email).
      let loginId: string | null = null;
      let registerId: string | null = null;
      for (const id of ids) {
        const r = await postForm("/login", id, { email: BURST_EMAIL, password: PASSWORD });
        if (r.body.includes(ENUMERATION_MSG)) loginId = id;
        else if (r.body.includes(ZOD_COPY)) registerId = id;
      }
      expect(loginId, "one id answers the anti-enumeration envelope").not.toBeNull();
      expect(registerId, "the sibling answers registerSchema's Zod copy").not.toBeNull();
      expect(registerId).not.toBe(loginId);

      // The SSR binding canary: the rendered /login form binds the
      // discriminated loginAction.
      const html = await (await fetch(`${FPP_BASE}/login`)).text();
      const bound = [...html.matchAll(/name="\$ACTION_1:0" value="\{&quot;id&quot;:&quot;([0-9a-f]{40,})&quot;/g)].map((m) => m[1]);
      expect(bound, "exactly one $ACTION_1:0 binding on the rendered login form").toHaveLength(1);
      expect(bound[0]).toBe(loginId);

      // Register burst iteration 1: the existing-email shape — the register
      // bucket is per-IP (register:local), so every register post counts.
      const reg1 = await postForm("/register", registerId!, {
        email: EXISTING_EMAIL,
        name: "",
        password: PASSWORD,
        confirmPassword: PASSWORD,
      });
      expect(reg1.status).toBe(200);
      expect(reg1.body, "iteration 1 answers the exists envelope").toContain(EXISTS_MSG);

      // LOAD-BEARING 1 (the login floor): iterations 2..10 stay in the
      // lawful window (the anti-enumeration envelope — the floor must not
      // fire early), then the 11th same-email attempt hits the floor with
      // a bounded retry-seconds value. A dropped loginAction limiter block
      // makes the 11th answer the credential check instead — exactly
      // where this assertion goes red while every existing gate stays
      // green (all their consumes are lawful « 10).
      for (let i = 2; i <= 10; i++) {
        const r = await postForm("/login", loginId!, { email: BURST_EMAIL, password: PASSWORD });
        expect(r.status, `login iteration ${i}`).toBe(200);
        expect(r.body, `login iteration ${i} stays in the lawful window`).toContain(ENUMERATION_MSG);
        expect(r.body, `login iteration ${i} must not hit the floor early`).not.toMatch(FLOOR_RE);
      }
      const floored = await postForm("/login", loginId!, { email: BURST_EMAIL, password: PASSWORD });
      const floorMatch = FLOOR_RE.exec(floored.body);
      const floorSeconds = floorMatch ? Number(floorMatch[1]) : 0;
      expect(floorMatch, "the 11th same-email login answers the floor envelope").not.toBeNull();
      expect(floorSeconds, "the retry hint is bounded (1..900)").toBeGreaterThanOrEqual(1);
      expect(floorSeconds, "the retry hint is bounded (1..900)").toBeLessThanOrEqual(900);

      // LOAD-BEARING 2 (the register floor): iterations 2..10 answer the
      // exists envelope, then the 11th register post hits the floor. A
      // dropped registerAction limiter block makes the 11th answer the
      // exists envelope instead — exactly where this goes red.
      for (let i = 2; i <= 10; i++) {
        const r = await postForm("/register", registerId!, {
          email: EXISTING_EMAIL,
          name: "",
          password: PASSWORD,
          confirmPassword: PASSWORD,
        });
        expect(r.status, `register iteration ${i}`).toBe(200);
        expect(r.body, `register iteration ${i} stays in the lawful window`).toContain(EXISTS_MSG);
        expect(r.body, `register iteration ${i} must not hit the floor early`).not.toMatch(FLOOR_RE);
      }
      const regFloored = await postForm("/register", registerId!, {
        email: EXISTING_EMAIL,
        name: "",
        password: PASSWORD,
        confirmPassword: PASSWORD,
      });
      const regFloorMatch = FLOOR_RE.exec(regFloored.body);
      const regFloorSeconds = regFloorMatch ? Number(regFloorMatch[1]) : 0;
      expect(regFloorMatch, "the 11th register answers the floor envelope").not.toBeNull();
      expect(regFloorSeconds, "the retry hint is bounded (1..900)").toBeGreaterThanOrEqual(1);
      expect(regFloorSeconds, "the retry hint is bounded (1..900)").toBeLessThanOrEqual(900);

      // The per-bucket control: a DIFFERENT email's login is NOT floored —
      // the bucket key includes the email, so the floor is per-target,
      // not a global lockout.
      const control = await postForm("/login", loginId!, { email: OTHER_EMAIL, password: PASSWORD });
      expect(control.body, "a different email is not floored").toContain(ENUMERATION_MSG);
      expect(control.body, "the floor must not leak across bucket keys").not.toMatch(FLOOR_RE);

      // The zero-writes proof (server truth the wire cannot see): the
      // burst created no users on the throwaway copy. The main e2e.db was
      // never written (only read once, at copyFileSync).
      const usersAfter = copyUserCount(copyUrl);
      expect(usersAfter, "the whole ladder persisted nothing").toBe(usersBefore);
    } finally {
      if (child) {
        const force = setTimeout(() => child?.kill("SIGKILL"), 5_000);
        const exited = new Promise<void>((resolve) => {
          const c = child;
          if (c) c.on("exit", () => resolve());
        });
        child.kill("SIGTERM");
        await exited;
        clearTimeout(force);
      }
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
