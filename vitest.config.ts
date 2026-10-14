import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit-test layer for the pure domain seams: money math (integer cents,
// shipping threshold), the schema-relative SQLite URL resolution contract,
// Zod validation schemas, the login rate limiter, the search-params coercion,
// the shared image/P2002 helpers, and the delivery-window estimator.
// Browser/E2E coverage lives in tests/e2e/*.spec.ts (Playwright — never picked
// up here, this config matches *.test.ts only).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
