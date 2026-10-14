import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` ships a self-contained server (.next/standalone/server.js) —
  // what the E2E suite boots against the scratch e2e database.
  output: "standalone",
  // Hide the floating dev-tools indicator — dev-only chrome with no
  // reference counterpart; it pollutes screenshots.
  devIndicators: false,
  // Pin file tracing to this project so the standalone server always lands
  // at .next/standalone/server.js even inside a parent workspace.
  outputFileTracingRoot: import.meta.dirname,
  // Product/hero art is served from images.unsplash.com (the reference's
  // image CDN); optimization is disabled so the server ships byte-identical
  // sources without a sharp dependency.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Next 16 dev-origin protection silently blocks dev chunks served to a
  // 127.0.0.1 origin (unhydrated page / native form fallbacks) — allow both
  // loopback hostnames during development. No effect on production builds.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Security headers. The reference platform (base44) ships
  // referrer-policy / strict-transport-security / x-content-type-options
  // (live-measured 2026-10-14); X-Frame-Options: DENY is the superset
  // (clickjacking hardening). HSTS over plain HTTP is a spec-defined no-op
  // (RFC 6797 §7.2), so the unconditional value is safe for localhost/E2E.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
