// Brand-metadata gate (session-24, F-K + F-K2 + F-L + F-M).
//
// The browser-chrome and share surfaces the app never shipped:
//
// 1. F-K — the swan mark: /favicon.ico and /icon.svg serve the re-authored
//    mark (measured reference colors) and the home head carries the icon
//    links. Until this round /favicon.ico was a 404 on every visit and the
//    browser tab showed the default globe.
//
// 2. F-K2 — the share card: the home head carries og:image + twitter:image
//    (the opengraph-image convention) and the PDP carries the product's own
//    first photograph. Until this round every share rendered text-only.
//
// 3. F-L — the manifest: /manifest.webmanifest serves the exact
//    installability contract (the Vite lineage's R18-01 remediation the
//    transform silently dropped) with the application/manifest+json
//    content-type — a served-BODY assertion, never just a status.
//
// 4. F-M — the font cache: the twelve immutable woff2 binaries ship
//    `Cache-Control: public, max-age=31536000, immutable` instead of
//    `max-age=0` (re-downloaded on every visit).
import { expect, test } from "@playwright/test";

const PDP_PATH = "/product/silk-draped-evening-gown"; // the L-2 seed-contract slug

test.describe("brand metadata assets (F-K / F-K2 / F-L / F-M)", () => {
  test("the swan mark serves over the wire and the home head carries the icon links", async ({
    page,
    request,
  }) => {
    const favicon = await request.get("/favicon.ico");
    expect(favicon.status()).toBe(200);
    expect(favicon.headers()["content-type"]).toContain("image/x-icon");
    // A real multi-size ICO: the ICONDIR count field (2 bytes at offset 4)
    // says 3 entries (16/32/48).
    const body = await favicon.body();
    expect(body.length).toBeGreaterThan(4);
    expect(body.readUInt16LE(4)).toBe(3);

    const svg = await request.get("/icon.svg");
    expect(svg.status()).toBe(200);
    expect(svg.headers()["content-type"]).toContain("image/svg+xml");
    expect(await svg.text()).toContain("swan mark");

    await page.goto("/");
    const iconLink = page.locator('link[rel="icon"], link[rel="shortcut icon"]').first();
    await expect(iconLink).toHaveCount(1);
    await expect(iconLink).toHaveAttribute("href", /icon\.svg|favicon\.ico/);
    const apple = page.locator('link[rel="apple-touch-icon"]');
    await expect(apple).toHaveCount(1);
  });

  test("the home head carries the og:image + twitter:image share card", async ({ page }) => {
    await page.goto("/");
    const og = page.locator('meta[property="og:image"]');
    await expect(og).toHaveCount(1);
    expect(await og.getAttribute("content")).toMatch(/opengraph-image/);
    // Twitter mirrors the card (the convention injects both roles).
    const tw = page.locator('meta[name="twitter:image"]');
    await expect(tw).toHaveCount(1);
    expect(await tw.getAttribute("content")).toMatch(/opengraph-image/);
  });

  test("the PDP share card is the product's own first photograph", async ({ page }) => {
    await page.goto(PDP_PATH);
    const og = page.locator('meta[property="og:image"]');
    await expect(og).toHaveCount(1);
    const content = await og.getAttribute("content");
    // The seeded catalog's first image for the canonical gown (unsplash CDN —
    // already allowed by images.remotePatterns; the share card needs no new
    // binary).
    expect(content).toContain("images.unsplash.com");
  });

  test("/manifest.webmanifest serves the exact installability contract", async ({
    request,
  }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/manifest+json");
    const manifest = (await res.json()) as Record<string, unknown>;

    expect(manifest.name).toBe("AURELIA");
    expect(manifest.short_name).toBe("AURELIA");
    expect(manifest.id).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe("#F8F7F6");
    expect(manifest.theme_color).toBe("#F8F7F6");
    const icons = manifest.icons as Array<Record<string, string>>;
    expect(icons).toHaveLength(2);
    expect(icons[0]).toMatchObject({ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" });
    expect(icons[1]).toMatchObject({ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" });
  });

  test("the home head links the manifest", async ({ page }) => {
    await page.goto("/");
    const link = page.locator('link[rel="manifest"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", /manifest\.webmanifest/);
  });

  test("self-hosted fonts ship immutable caching", async ({ request }) => {
    const res = await request.get("/fonts/cormorant-garamond-300.woff2");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  });
});
