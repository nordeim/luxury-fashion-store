// F-H (session-22): the SEO metadata seam — the pure decision layer behind
// the /sitemap.xml and /robots.txt metadata routes.
//
// The docs have advertised this contract since session 1 ("NEXT_PUBLIC_SITE_URL —
// canonical/og:url + sitemap origin"); the routes did not exist (F-H). The
// seam owns every decision so the routes stay thin executors:
//
//   siteOrigin        — the documented default-origin fallback + normalization
//   buildSitemapEntries — statics first (canonical order), ACTIVE products only
//   buildRobots       — the exact allow/disallow contract + the sitemap URL
//
// The build must stay DB-free: the routes are force-dynamic and delegate here.
import { describe, expect, it } from "vitest";
import { buildRobots, buildSitemapEntries, ROBOTS_DISALLOW, siteOrigin } from "./sitemap";

const T0 = new Date("2026-01-01T00:00:00.000Z");
const T1 = new Date("2026-02-02T03:04:05.000Z");

describe("siteOrigin (the documented default-origin fallback)", () => {
  it("falls back to http://localhost:3000 when the env var is unset or blank", () => {
    expect(siteOrigin(undefined)).toBe("http://localhost:3000");
    expect(siteOrigin("")).toBe("http://localhost:3000");
    expect(siteOrigin("   ")).toBe("http://localhost:3000");
  });

  it("normalizes the origin — trailing slashes stripped, value preserved", () => {
    expect(siteOrigin("https://aurelia.example/")).toBe("https://aurelia.example");
    expect(siteOrigin("https://aurelia.example///")).toBe("https://aurelia.example");
  });
});

describe("buildSitemapEntries (statics first, ACTIVE products only)", () => {
  const products = [
    { slug: "silk-draped-evening-gown", updatedAt: T0, isActive: true },
    { slug: "retired-piece", updatedAt: T1, isActive: false },
    { slug: "cashmere-wrap-coat", updatedAt: T1, isActive: true },
  ];

  it("emits the four static surfaces first in canonical order", () => {
    const entries = buildSitemapEntries("http://localhost:3000", []);
    expect(entries.map((e) => e.url)).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/shop",
      "http://localhost:3000/login",
      "http://localhost:3000/register",
    ]);
  });

  it("excludes inactive products — the active-only contract the route relies on", () => {
    const entries = buildSitemapEntries("http://localhost:3000", products);
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/product/silk-draped-evening-gown");
    expect(urls).toContain("http://localhost:3000/product/cashmere-wrap-coat");
    expect(urls.some((u) => u.includes("retired-piece"))).toBe(false);
  });

  it("passes product lastModified through untouched (route order preserved)", () => {
    const entries = buildSitemapEntries("http://localhost:3000", products);
    const productEntries = entries.filter((e) => e.url.includes("/product/"));
    expect(productEntries.map((e) => e.url)).toEqual([
      "http://localhost:3000/product/silk-draped-evening-gown",
      "http://localhost:3000/product/cashmere-wrap-coat",
    ]);
    expect(productEntries.map((e) => e.lastModified)).toEqual([T0, T1]);
  });

  it("normalizes a trailing-slash base into every emitted URL", () => {
    const entries = buildSitemapEntries("https://aurelia.example/", [
      { slug: "silk-draped-evening-gown", updatedAt: T0, isActive: true },
    ]);
    for (const entry of entries) {
      expect(entry.url.startsWith("https://aurelia.example/")).toBe(true);
      expect(entry.url.includes("//product")).toBe(false);
    }
    expect(entries.at(-1)?.url).toBe("https://aurelia.example/product/silk-draped-evening-gown");
  });

  it("never emits a noindex surface", () => {
    const entries = buildSitemapEntries("http://localhost:3000", []);
    for (const entry of entries) {
      for (const banned of ["/admin", "/api", "/account", "/cart", "/checkout", "/wishlist"]) {
        expect(entry.url.startsWith(`http://localhost:3000${banned}`)).toBe(false);
      }
    }
  });
});

describe("buildRobots (the exact allow/disallow contract)", () => {
  it("allows the root, disallows exactly the noindex surfaces, and points at the sitemap", () => {
    const robots = buildRobots("http://localhost:3000");
    expect(robots.sitemap).toBe("http://localhost:3000/sitemap.xml");
    // Next's Robots["rules"] type unions a single rule with an array — the
    // seam's contract IS the array shape, so narrow and pin it.
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    expect(rules).toHaveLength(1);
    expect(rules[0].allow).toBe("/");
    expect(rules[0].disallow).toEqual([
      "/admin",
      "/api",
      "/account",
      "/cart",
      "/checkout",
      "/wishlist",
    ]);
    expect(ROBOTS_DISALLOW).toHaveLength(6);
  });

  it("respects the default-origin fallback and normalization", () => {
    const robots = buildRobots(undefined);
    expect(robots.sitemap).toBe("http://localhost:3000/sitemap.xml");
    const normalized = buildRobots("https://aurelia.example/");
    expect(normalized.sitemap).toBe("https://aurelia.example/sitemap.xml");
  });
});
