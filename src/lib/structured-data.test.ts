import { describe, expect, it } from "vitest";
import { productJsonLd } from "./structured-data";
import type { ProductCardData } from "./products";

// F-B (session-19): the README has documented the PDP's JSON-LD since the
// first release — the code never shipped it. This seam builds the
// schema.org Product graph from the pure card DTO; the PDP page embeds it
// as a non-executing data block (invisible to CSP script-src and to the
// resting census).

const FIXTURE: ProductCardData = {
  id: "prod_123",
  slug: "silk-draped-evening-gown",
  name: "Silk Draped Evening Gown",
  brand: "VELOUR",
  description: "A floor-sweeping silk gown.",
  price: 42900, // $429.00, integer cents
  compareAtPrice: 55900,
  discount: 23,
  subcategory: "Gowns",
  categorySlug: "women",
  sizes: ["XS", "S", "M"],
  colors: ["Ivory"],
  images: ["https://images.unsplash.com/one.jpg", "https://images.unsplash.com/two.jpg"],
  tag: null,
  rating: 4.8,
  reviewCount: 24,
  isNew: false,
  isBestseller: true,
  stock: 7,
};

describe("productJsonLd", () => {
  const ld = productJsonLd(FIXTURE, "https://aurelia.example");

  it("emits a schema.org Product graph", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Product");
  });

  it("carries the identity fields and absolutizes images", () => {
    expect(ld.name).toBe("Silk Draped Evening Gown");
    expect(ld.sku).toBe("prod_123");
    expect(ld.description).toBe("A floor-sweeping silk gown.");
    expect(ld.image).toEqual([
      "https://images.unsplash.com/one.jpg",
      "https://images.unsplash.com/two.jpg",
    ]);
    expect(ld.brand).toEqual({ "@type": "Brand", name: "VELOUR" });
  });

  it("converts the integer-cents price to an Offer (dollars, USD, in stock)", () => {
    expect(ld.offers).toEqual({
      "@type": "Offer",
      url: "https://aurelia.example/product/silk-draped-evening-gown",
      price: "429.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    });
  });

  it("maps zero stock to OutOfStock", () => {
    const out = productJsonLd({ ...FIXTURE, stock: 0 }, "https://aurelia.example");
    expect(out.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("absolutizes a relative image path against the origin", () => {
    const rel = productJsonLd(
      { ...FIXTURE, images: ["/img/gown.jpg"] },
      "https://aurelia.example"
    );
    expect(rel.image).toEqual(["https://aurelia.example/img/gown.jpg"]);
  });
});
