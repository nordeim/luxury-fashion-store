// F-L (session-24): the PWA manifest seam — the pure decision layer behind
// the /manifest.webmanifest metadata route.
//
// The Vite lineage shipped a manifest + its E2E gate (168d2ec, R18-01); the
// Next.js transform (8c675a7) silently dropped both. The reference's own
// /manifest.webmanifest is its SPA catch-all (text/html), so a real manifest
// is pure superset — installability — but a documented remediation lost in a
// transform is exactly the F-H class of drift. The seam owns every decision so
// the route stays a thin executor. Unlike sitemap.ts this contract is
// ORIGIN-INDEPENDENT (every path is root-relative) and DB-FREE (static route,
// no force-dynamic):
//
//   buildManifest — identity (AURELIA), installability (id/scope/start_url /,
//                   display standalone), the measured palette (#F8F7F6 warm
//                   paper on both color roles), and the two self-hosted swan
//                   icons (192 + 512, image/png, purpose any).
//
// Zero visual surface: install metadata only — the parity census is unaffected
// by construction (proven by the 19a=19b byte-equal ritual).
import { describe, expect, it } from "vitest";
import { buildManifest } from "./manifest";

describe("buildManifest (F-L: the installability contract the transform dropped)", () => {
  const manifest = buildManifest();

  it("carries the brand identity — name and short_name are AURELIA", () => {
    expect(manifest.name).toBe("AURELIA");
    expect(manifest.short_name).toBe("AURELIA");
  });

  it("is installable from the root — id, scope, and start_url all /", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url).toBe("/");
  });

  it("renders standalone — a real app window, not a browser tab", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("paints the measured palette — warm paper on both color roles", () => {
    expect(manifest.background_color).toBe("#F8F7F6");
    expect(manifest.theme_color).toBe("#F8F7F6");
  });

  it("lists exactly the two self-hosted swan icons at 192 and 512", () => {
    expect(manifest.icons).toHaveLength(2);
    const [i192, i512] = manifest.icons ?? [];
    expect(i192).toMatchObject({ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" });
    expect(i512).toMatchObject({ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" });
  });

  it("describes the house — a non-empty description mentioning the maison", () => {
    expect(manifest.description).toBeTruthy();
    expect(manifest.description).toContain("AURELIA");
  });
});
