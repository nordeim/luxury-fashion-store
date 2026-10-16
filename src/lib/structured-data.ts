// F-B (session-19): the README has documented the PDP's JSON-LD since the
// first release; this seam finally ships it. The graph is built from the
// pure card DTO and embedded by the PDP page as a NON-EXECUTING data block
// (`<script type="application/ld+json">`) — data blocks are not gated by
// CSP script-src (the HTML spec exempts them from the inline-script check)
// and are invisible to the resting census.

import type { ProductCardData } from "./products";

export interface ProductJsonLd {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  sku: string;
  image: string[];
  brand: { "@type": "Brand"; name: string };
  offers: {
    "@type": "Offer";
    url: string;
    price: string;
    priceCurrency: "USD";
    availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock";
    itemCondition: "https://schema.org/NewCondition";
  };
}

function absolutize(url: string, origin: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${origin.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Build the schema.org Product graph for the PDP (pure; money in integer cents). */
export function productJsonLd(product: ProductCardData, origin: string): ProductJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    image: product.images.map((img) => absolutize(img, origin)),
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      url: absolutize(`/product/${product.slug}`, origin),
      // Selling price in dollars — Offer.price is a numeric string, two
      // decimals; the compare-at price is presentation-only and stays out.
      price: (product.price / 100).toFixed(2),
      priceCurrency: "USD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}
