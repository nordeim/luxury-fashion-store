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

// F-D (session-20): HTML-safe JSON embedding for the PDP's data block — the
// codebase's ONLY dangerouslySetInnerHTML. JSON.stringify output is JS-safe
// but NOT HTML-safe: the HTML parser (not the JS engine) terminates a
// <script> element at the first `</script` sequence, even inside a JSON
// string, so a hostile future product string could break out of the data
// block. The OWASP-recommended hardening: escape `<` after stringify; the
// U+2028/U+2029 line separators ride along (irrelevant inside a data block,
// mandatory if the value is ever inlined into a classic script). On the
// current seed the mapping is the identity — no escapable characters exist —
// so the embedded bytes are unchanged (rest-invariance, unit-pinned).
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// F-N (session-25): the store-root identity graphs. The reference's home head
// carries TWO builder-injected blocks (measured first-hand, 2026-10-17):
// WebSite {name, url} and Organization {name, logo, url}. The clone shipped
// zero — a parity gap in the non-visual layer (the PDP's Product graph never
// covered the store identity). The Organization logo is the clone's OWN
// self-hosted swan mark (the F-K asset), absolutized with the same contract
// as the product images — no third-party runtime dependency.

export interface WebsiteJsonLd {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
}

export interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  logo: string;
  url: string;
}

/** Build the store-root identity graphs (pure; mirrors the reference's two-block shape). */
export function storeRootJsonLd(origin: string): [WebsiteJsonLd, OrganizationJsonLd] {
  // The store root IS the origin — the measured reference url carries no
  // trailing slash (absolutize("/") would keep one; the identity graphs pin
  // the origin itself, slash-normalized).
  const url = origin.replace(/\/$/, "");
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AURELIA",
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AURELIA",
      logo: absolutize("/icons/icon-512.png", origin),
      url,
    },
  ];
}
