// SEO metadata gate (session-22, F-H).
//
// The docs have advertised the sitemap-origin contract since session 1; the
// paths were served by the SCAFFOLD's stale foreign statics (public/robots.txt
// + public/sitemap.xml — a Vite :4173 lineage artifact with an /order-success
// route this app does not have) until F-H deleted them and the metadata routes
// took over. This gate pins the served artifact over the wire: /robots.txt serves the EXACT allow/disallow contract and the sitemap
// URL; /sitemap.xml serves the four indexable statics + the FULL canonical
// catalog (12 active pieces — the same canonical floor the admin KPI pins)
// on the DOCUMENTED default origin (the E2E webServer intentionally runs with
// NEXT_PUBLIC_SITE_URL unset, so the fallback contract itself is what's
// pinned), and never lists a noindex surface.
import { expect, test } from "@playwright/test";

const ORIGIN = "http://localhost:3000"; // the documented DEFAULT_SITE_ORIGIN
const DISALLOW = ["/admin", "/api", "/account", "/cart", "/checkout", "/wishlist"];

test.describe("SEO metadata routes (F-H)", () => {
  test("/robots.txt serves the exact allow/disallow contract + the sitemap URL", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Allow: /");
    for (const path of DISALLOW) {
      expect(body, `robots must disallow ${path}`).toContain(`Disallow: ${path}`);
    }
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  test("/sitemap.xml lists the canonical catalog on the default origin — and nothing noindex", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");

    // The four indexable statics, canonical order first.
    expect(body).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(body.indexOf(`<loc>${ORIGIN}/</loc>`)).toBeLessThan(
      body.indexOf(`<loc>${ORIGIN}/shop</loc>`),
    );
    expect(body).toContain(`<loc>${ORIGIN}/shop</loc>`);
    expect(body).toContain(`<loc>${ORIGIN}/login</loc>`);
    expect(body).toContain(`<loc>${ORIGIN}/register</loc>`);

    // The full canonical catalog (12 active pieces, seed = contract), and
    // the canonical PDP pinned by name (the L-2 reference slug).
    const productLocs = body.match(new RegExp(`<loc>${ORIGIN.replace(".", "\\.")}/product/`, "g"));
    expect(productLocs, "all 12 active pieces in the sitemap").toHaveLength(12);
    expect(body).toContain(`<loc>${ORIGIN}/product/silk-draped-evening-gown</loc>`);

    // No noindex surface anywhere in the document.
    for (const banned of DISALLOW) {
      expect(body, `sitemap must not list ${banned}`).not.toContain(`<loc>${ORIGIN}${banned}`);
    }
    // PDP entries carry <lastmod> (the products' updatedAt passthrough).
    expect(body).toContain("<lastmod>");
  });
});
