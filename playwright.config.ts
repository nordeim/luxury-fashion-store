import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// E2E layer: boots the PRODUCTION standalone server on an isolated port with
// its own scratch database (db/e2e.db, schema-pushed + seeded by the global
// setup), then drives the real UI in Chromium.
//
// Prerequisites: `npm run build` (the standalone server must exist).
// Run with: `npm run test:e2e`.
//
// Auth strategy: the "setup" project signs the demo user in ONCE and saves
// the session cookie to tests/e2e/.auth/user.json; every spec in the main
// project starts with that storageState. This is not just speed — the auth
// endpoints are rate-limited (10 attempts/IP/15 min), so per-test logins
// would trip the limiter mid-suite. specs that need a logged-out surface
// opt back out with an empty storageState.
//
// The unit layer stays in Vitest (see vitest.config.ts — it matches
// *.test.ts only, so these *.spec.ts / *.setup.ts files are never picked
// up twice).

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
// ABSOLUTE file URL. The standalone bundle COPIES prisma/schema.prisma
// (file tracing sees db-path's existsSync reads), so inside
// .next/standalone the schema-relative "file:../db/e2e.db" re-anchors to
// <standalone>/db/e2e.db — a file that never exists. db-path passes
// absolute URLs through untouched, which defeats the moved anchor.
const E2E_DATABASE_URL = `file:${path.resolve(process.cwd(), "db", "e2e.db")}`;
const AUTH_DIR = "tests/e2e/.auth";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // one worker: the specs share a single seeded SQLite file
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Per-project auth setup: each project signs in FRESH and saves its own
    // storageState. One shared file + one shared server session is a trap —
    // a spec that logs out (auth.spec.ts) destroys the server-side session
    // row, which silently logs out EVERY later spec in BOTH projects (guest
    // mode surfaced mid-suite: header flipped to "Sign in", checkout
    // shipping guard never enabled). Independent sessions per project make
    // each project's runs order-independent.
    {
      name: "setup-chromium",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup-chromium"],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_DIR + "/chromium.json",
      },
    },
    {
      name: "setup-mobile",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "mobile",
      dependencies: ["setup-mobile"],
      testIgnore: /auth\.setup\.ts/,
      use: {
        // Chromium engine on the iPhone 14 profile — WebKit needs host
        // libraries most CI images lack (inherited decision from the
        // repo's previous incarnation; keeps mobile coverage portable).
        ...devices["iPhone 14"],
        browserName: "chromium",
        storageState: AUTH_DIR + "/mobile.json",
      },
    },
  ],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: "node .next/standalone/server.js",
    url: `${BASE_URL}/api/health`,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: "playwright-e2e-session-secret",
    } as Record<string, string>,
  },
});
