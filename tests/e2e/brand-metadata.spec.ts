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
//
// Session-25 extension (F-N / F-O / F-P / F-Q — the store-root identity +
// first-paint transport catch-up):
//
// 5. F-N — the home head carries the WebSite + Organization JSON-LD the
//    reference itself ships (measured 2026-10-17) and BOTH data blocks carry
//    the request nonce in the served bytes (the security-csp gate's per-tag
//    assertion runs on `/`; Next stamps only scripts it controls).
// 6. F-O — the first-paint font preloads ship with crossorigin (the @font-face
//    fetch is CORS-mode; a preload without it double-downloads).
// 7. F-P — the browser-chrome tint (theme-color) is the measured paper the
//    manifest pins.
// 8. F-Q — the RFC 9116 security-contact file serves with the real channel.
//
// Session-26 extension (F-R / F-S / F-T / F-V — the structural + auth-identity
// + canonical + product-OG catch-up):
//
// 9. F-S — the auth pages carry the reference-measured identity graphs: the
//    (auth) layout ships WebSite + Organization (the same site-level blocks
//    the storefront layout renders — the reference's builder injects them on
//    every page) and each page adds its own BreadcrumbList (login's is the
//    measured block; register's is the parallel form). All three blocks carry
//    the request nonce in the served bytes.
// 10. F-T — canonical links ship on the four indexable statics (home keeps
//     its trailing slash, the measured ref shape) + the PDP (pinned — it
//     shipped unasserted).
// 11. F-V — the PDP carries the product price for share crawlers via the
//     typed Metadata.other contract (name-attributed; og:type stays website
//     — Next's OpenGraphType lacks "product", a cast was rejected).
//
// Session-27 extension (F-W — the PDP's site-level OG identity):
//
// 12. F-W — Next merges metadata SHALLOWLY per segment: the PDP's child
//     `openGraph` (the F-K2 product image) REPLACED the root layout's
//     site-level block wholesale, silently dropping og:type / og:site_name /
//     og:url from the PDP head (served-bytes verified — every other page
//     carries them). The re-declared fields pin here so the drift cannot
//     recur.
//
// Session-28 extension (F-X — the referenced targets finally fetched):
//
// 13. F-X — the manifest case asserts the icon SRC strings and the F-N case
//     asserts the Organization logo URL, but no case ever FETCHED the files:
//     a renamed/deleted `public/icons/*.png` would 404 the PWA install and
//     the identity graph's logo while every gate stays green. The F-H2
//     lesson's sibling — assert the referenced TARGETS, not just the
//     reference. Expectations derive from the served artifacts themselves.
//
// Session-29 extension (F-Z — the preload pin's referenced targets):
//
// 14. F-Z — the F-O preload case asserts three href STRINGS and the F-M case
//     fetches exactly ONE font file; the other two referenced targets were
//     never fetched (a renamed `public/fonts/montserrat-*.woff2` would 404
//     the first-paint preload with every gate green). The new case derives
//     its fetch list from the SERVED DOM's preload set and fetches every
//     target (200 + font/woff2 + nonzero body).
import { expect, test } from "@playwright/test";

const PDP_PATH = "/product/silk-draped-evening-gown"; // the L-2 seed-contract slug

test.describe("brand metadata assets (F-K / F-K2 / F-L / F-M / F-N / F-O / F-P / F-Q)", () => {
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

  // F-N (session-25): the store-root identity graphs the reference itself
  // ships — read from the SERVED BYTES (data blocks' content lives in the
  // HTML; the DOM hides nothing here, but the nonce does — browsers move it
  // to an internal slot, trap #33's discipline applies to assertions too).
  test("the home head carries the WebSite + Organization JSON-LD with the request nonce", async ({
    page,
  }) => {
    const response = await page.goto("/");
    const html = (await response?.text()) ?? "";
    // Isolate the script-src DIRECTIVE before splitting (the raw header's
    // nonce token carries the next directive's trailing ';' — the
    // security-csp gate's scriptSrcOf discipline).
    const scriptSrc =
      (response?.headers()["content-security-policy"] ?? "")
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith("script-src")) ?? "";
    const nonce = scriptSrc
      .split(" ")
      .find((s) => s.startsWith("'nonce-"))
      ?.slice(7, -1);
    expect(nonce, "header nonce extracted").toBeTruthy();

    const blocks = Array.from(
      html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)
    ).map((m) => JSON.parse(m[1]) as Record<string, unknown>);
    expect(blocks).toHaveLength(2);

    // Reference-measured shapes (2026-10-17): WebSite {name,url} then
    // Organization {name,logo,url} — the logo is the clone's OWN mark.
    expect(blocks[0]).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AURELIA",
      url: "http://localhost:3000",
    });
    expect(blocks[1]).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AURELIA",
      logo: "http://localhost:3000/icons/icon-512.png",
      url: "http://localhost:3000",
    });

    // Both data blocks carry the exact request nonce in the served bytes.
    const ldTags = Array.from(
      html.matchAll(/<script type="application\/ld\+json"[^>]*>/g)
    ).map((m) => m[0]);
    expect(ldTags).toHaveLength(2);
    for (const tag of ldTags) {
      expect(tag, `data block lacks the nonce: ${tag}`).toContain(`nonce="${nonce}"`);
    }
  });

  // F-O (session-25): the first-paint preloads — three files, the measured
  // weight set, each with crossorigin (a preload without it double-fetches).
  test("the first-paint font preloads ship with crossorigin", async ({ page }) => {
    await page.goto("/");
    const preloads = page.locator('link[rel="preload"][as="font"]');
    await expect(preloads).toHaveCount(3);
    const hrefs = await preloads.evaluateAll((els) =>
      els.map((el) => el.getAttribute("href"))
    );
    expect(hrefs).toEqual([
      "/fonts/cormorant-garamond-300.woff2",
      "/fonts/montserrat-300.woff2",
      "/fonts/montserrat-400.woff2",
    ]);
    const crossings = await preloads.evaluateAll((els) =>
      els.map((el) => el.getAttribute("crossorigin"))
    );
    for (const c of crossings) expect(c, "every font preload sets crossorigin").not.toBeNull();
  });

  // F-Z (session-29): the F-O pin's missing hop — the preload case asserts
  // the href STRINGS and the F-M case fetches exactly ONE font file; the
  // other two referenced targets were never fetched. A renamed/deleted
  // public/fonts/montserrat-*.woff2 would 404 the first-paint preload while
  // every gate stays green. The F-X lesson one layer down — assert the
  // referenced TARGETS, not just the reference. Expectations derive from the
  // SERVED DOM's preload set (no duplicated literals).
  test("every first-paint preload target serves over the wire", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const hrefs = await page
      .locator('link[rel="preload"][as="font"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, "preload href is a root-relative path").toMatch(/^\//);
      const res = await request.get(href as string);
      expect(res.status(), `GET ${href}`).toBe(200);
      expect(
        res.headers()["content-type"],
        `${href} content-type`
      ).toContain("font/woff2");
      expect(
        (await res.body()).length,
        `${href} nonzero body`
      ).toBeGreaterThan(100);
    }
  });

  // F-P (session-25): the browser-chrome tint — the measured paper the
  // manifest's theme_color already pins.
  test("the browser chrome tints to the measured paper (theme-color)", async ({ page }) => {
    await page.goto("/");
    const meta = page.locator('meta[name="theme-color"]');
    await expect(meta).toHaveCount(1);
    await expect(meta).toHaveAttribute("content", "#F8F7F6");
  });

  // F-Q (session-25): the RFC 9116 security-contact file — the production
  // hygiene surface, served from the static bundle.
  test("the RFC 9116 security.txt serves with the real contact channel", async ({
    request,
  }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain(
      "Contact: https://github.com/nordeim/luxury-fashion-store/security/advisories/new"
    );
    expect(body).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
  });

  // F-V (session-26): the product price on the share surface — moved to the
  // session-26 describe below (it groups the logged-out opt-out the auth
  // surfaces need).

  // F-W (session-27): the site-level OG identity survives the PDP's child
  // openGraph override — Next shallow-merges metadata per segment, so the
  // override had replaced the root block (og:type / og:site_name / og:url
  // vanished from the served PDP head while every other page carries them).
  test("the PDP head carries the site-level OG identity fields", async ({
    request,
  }) => {
    const res = await request.get(PDP_PATH);
    expect(res.status()).toBe(200);
    const html = await res.text();
    // Exact served-bytes serialization (Next emits property-attributed og
    // metas; the og:url keeps the site-wide origin convention — the root
    // layout's declaration — while the canonical link carries the per-page
    // identity).
    expect(html).toContain('<meta property="og:type" content="website"/>');
    expect(html).toContain('<meta property="og:site_name" content="AURELIA"/>');
    expect(html).toContain(
      '<meta property="og:url" content="http://localhost:3000"/>'
    );
  });

  // F-X (session-28): every REFERENCED brand asset serves — the contract the
  // string pins stopped one hop short of. The icon/logo expectations are
  // derived from the SERVED manifest + SERVED home JSON-LD (no duplicated
  // literals to drift); the fetch list is exactly the referenced set plus
  // the two file-convention head surfaces (apple icon, share card).
  test("every referenced brand asset serves over the wire", async ({
    request,
  }) => {
    // The manifest body is the source of the icon contract.
    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.status()).toBe(200);
    const manifest = (await manifestRes.json()) as {
      icons: Array<{ src: string; type: string }>;
    };
    expect(manifest.icons.length).toBeGreaterThan(0);

    // The home JSON-LD is the source of the Organization logo contract.
    const homeRes = await request.get("/");
    expect(homeRes.status()).toBe(200);
    const homeHtml = await homeRes.text();
    const blocks = Array.from(
      homeHtml.matchAll(
        /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/g
      )
    ).map((m) => JSON.parse(m[1]) as Record<string, unknown>);
    const org = blocks.find((b) => b["@type"] === "Organization") as
      | { logo: string }
      | undefined;
    expect(org, "home carries the Organization graph").toBeTruthy();
    expect(org!.logo, "Organization logo is an absolute URL").toMatch(
      /^https?:\/\//
    );

    // The referenced set + the file-convention head surfaces.
    const assets: Array<[string, string]> = [
      ...manifest.icons.map((i) => [i.src, i.type] as [string, string]),
      [org!.logo.replace(/^https?:\/\/[^/]+/, ""), "image/png"],
      ["/apple-icon.png", "image/png"],
      ["/opengraph-image.png", "image/png"],
    ];
    for (const [src, type] of assets) {
      const res = await request.get(src);
      expect(res.status(), `GET ${src}`).toBe(200);
      expect(
        res.headers()["content-type"],
        `${src} content-type`
      ).toContain(type);
      expect((await res.body()).length, `${src} nonzero body`).toBeGreaterThan(
        100
      );
    }
  });
});

// Session-26 extension (F-S / F-T / F-V): the auth pages REDIRECT a session
// to /account (the page guard), so these cases run logged-out — the
// established empty-storageState opt-out (the a11y/auth specs' pattern).
test.describe("brand metadata assets — session-26 (F-S / F-T / F-V)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // F-S (session-26): the auth identity + breadcrumb graphs — the reference's
  // login head carries THREE builder-injected blocks (measured 2026-10-17);
  // the clone's (auth) group shipped zero until this round.
  test("the auth pages carry the identity graphs + the page breadcrumb with the request nonce", async ({
    request,
  }) => {
    for (const [path, leaf] of [
      ["/login", "login"],
      ["/register", "register"],
    ] as const) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      const scriptSrc =
        (res.headers()["content-security-policy"] ?? "")
          .split(";")
          .map((d) => d.trim())
          .find((d) => d.startsWith("script-src")) ?? "";
      const nonce = scriptSrc
        .split(" ")
        .find((s) => s.startsWith("'nonce-"))
        ?.slice(7, -1);
      expect(nonce, `${path} header nonce extracted`).toBeTruthy();

      const blocks = Array.from(
        html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)
      ).map((m) => JSON.parse(m[1]) as Record<string, unknown>);
      expect(blocks, `${path} serves three graphs`).toHaveLength(3);
      // Served order matches the reference: site-level blocks (the layout)
      // first, then the page-level breadcrumb.
      expect(blocks[0]["@type"]).toBe("WebSite");
      expect(blocks[1]["@type"]).toBe("Organization");
      expect(blocks[2]["@type"]).toBe("BreadcrumbList");
      expect(blocks[0]).toEqual({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AURELIA",
        url: "http://localhost:3000",
      });
      expect(blocks[2]).toEqual({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "http://localhost:3000/" },
          { "@type": "ListItem", position: 2, name: leaf, item: `http://localhost:3000${path}` },
        ],
      });

      const ldTags = Array.from(
        html.matchAll(/<script type="application\/ld\+json"[^>]*>/g)
      ).map((m) => m[0]);
      expect(ldTags, `${path} block count`).toHaveLength(3);
      for (const tag of ldTags) {
        expect(tag, `${path} data block lacks the nonce: ${tag}`).toContain(
          `nonce="${nonce}"`
        );
      }
    }
  });

  // F-T (session-26): canonical links on the indexable surfaces — the
  // reference ships them on home (trailing slash, measured) and login; the
  // clone's four statics + the PDP now all pin one (the PDP's shipped
  // unasserted since its metadata landed).
  test("canonical links serve on the indexable surfaces", async ({ request }) => {
    const cases: Array<[string, string]> = [
      // Next's resolveAbsoluteUrlWithPathname collapses a root-path canonical
      // to the bare origin (pathname "/" + no query -> result.origin) — the
      // measured reference ships "…/" with the slash; RFC-3986-equivalent.
      ["/", "http://localhost:3000"],
      ["/shop", "http://localhost:3000/shop"],
      ["/login", "http://localhost:3000/login"],
      ["/register", "http://localhost:3000/register"],
      [PDP_PATH, "http://localhost:3000" + PDP_PATH],
    ];
    for (const [path, href] of cases) {
      const res = await request.get(path);
      expect(res.status(), `GET ${path}`).toBe(200);
      const html = await res.text();
      const canonical = html.match(
        /<link rel="canonical" href="([^"]+)"\/>/
      )?.[1];
      expect(canonical, `${path} canonical present`).toBe(href);
    }
  });

  // F-V (session-26): the product price on the share surface — the typed
  // Metadata.other contract (name-attributed; see the F-V residual notes in
  // docs/remediation-plan-session26.md §4).
  test("the PDP carries the product price for share crawlers", async ({
    request,
  }) => {
    const res = await request.get(PDP_PATH);
    expect(res.status()).toBe(200);
    const html = await res.text();
    // The seeded gown: 285000 integer cents -> "2850.00" (the same /100
    // arithmetic the Product JSON-LD unit-pins).
    expect(html).toContain('<meta name="product:price:amount" content="2850.00"/>');
    expect(html).toContain('<meta name="product:price:currency" content="USD"/>');
  });
});
