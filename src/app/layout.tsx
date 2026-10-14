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
};

// Root layout is a minimal shell (fonts are CSS @font-face; metadata only).
// Shopper chrome (header/footer/overlays) lives in the (storefront) group
// layout; auth pages are chrome-less in the (auth) group — ADR-008.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased-none" style={{ WebkitFontSmoothing: "auto" }}>
        {children}
      </body>
    </html>
  );
}
