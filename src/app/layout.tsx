import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AURELIA",
    template: "%s | AURELIA",
  },
  description:
    "AURELIA — crafting timeless luxury since 1987. Discover women's and men's collections, fine accessories and shoes from the world's finest ateliers.",
  openGraph: {
    siteName: "AURELIA",
    type: "website",
    url: siteUrl,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // F-P (session-25): mobile browser chrome tints to the measured paper —
  // the same color the PWA manifest pins (buildManifest's brand color), so
  // the URL bar matches the page and the installed app alike.
  themeColor: "#F8F7F6",
};

// F-O (session-25): the first-paint font preloads. The twelve self-hosted
// woff2 binaries are declared via CSS @font-face and were discovered only
// AFTER the stylesheet downloaded and parsed — a first-paint FOUT window on
// every cold visit (the head preloaded 16 images and zero fonts,
// wire-verified). These three are the first-paint weight set: the hero
// display + header logotype (Cormorant 300 `font-light`), the hero
// kicker/accent (Montserrat 300), and the `--font-sans` body default
// (Montserrat 400). `crossorigin` is REQUIRED even same-origin: @font-face
// fetches run in CORS mode, and a preload without it double-downloads. The
// F-M cache header covers /fonts/:file* — preloads inherit immutable
// caching. React 19 hoists these <link>s to the head.
const FONT_PRELOADS = [
  "/fonts/cormorant-garamond-300.woff2",
  "/fonts/montserrat-300.woff2",
  "/fonts/montserrat-400.woff2",
] as const;

// Root layout is a minimal shell (fonts are CSS @font-face; metadata only).
// Shopper chrome (header/footer/overlays) lives in the (storefront) group
// layout; auth pages are chrome-less in the (auth) group — ADR-008.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {FONT_PRELOADS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body className="antialiased-none" style={{ WebkitFontSmoothing: "auto" }}>
        {children}
      </body>
    </html>
  );
}
