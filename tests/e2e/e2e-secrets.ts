// Single source of truth for the E2E webServer's AUTH_SECRET.
//
// playwright.config.ts injects this into the standalone server's env, and the
// accessibility-axe gate imports it to MINT session cookies offline (the L-3
// admin coverage: a session-row SQL fixture + an HMAC computed with the same
// secret). A cookie signed with anything else fails verification before any
// DB hit (src/lib/auth.ts parseCookieValue) — keeping the two consumers on one
// constant makes the drift impossible by construction.
export const E2E_AUTH_SECRET = "playwright-e2e-session-secret";
