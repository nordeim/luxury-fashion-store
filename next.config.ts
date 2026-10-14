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
  // (live-measured 2026-10-14); the rest is the superset (F-7, session-3):
  // - CSP: default-src 'self'; Next.js hydration/RSC payload requires inline
  //   scripts, and Tailwind/Next inject inline styles, hence 'unsafe-inline'
  //   on those two directives only; catalog/hero art loads from Unsplash.
  //   frame-ancestors 'none' duplicates X-Frame-Options (belt and braces).
  // - Permissions-Policy: no browser capabilities are used — deny the noisy
  //   ones explicitly.
  // - COOP: process isolation for the storefront.
  async headers() {
    // Dev-only escape hatch: React's development runtime uses eval() for
    // debugging features (callstack reconstruction). Production React does
    // not — the shipped CSP stays eval-free (F-7, session-3).
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.unsplash.com",
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
