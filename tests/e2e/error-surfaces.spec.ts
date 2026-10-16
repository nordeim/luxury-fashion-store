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
