import { describe, expect, it } from "vitest";
import { productJsonLd, serializeJsonLd } from "./structured-data";
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

// F-D (session-20): the PDP embeds the JSON-LD via dangerouslySetInnerHTML —
// the codebase's ONLY raw-HTML sink. JSON.stringify output is JS-safe but
// NOT HTML-safe: a `</script>` sequence inside any future string value
// would terminate the data block early and inject markup. serializeJsonLd
// is the OWASP-recommended HTML-safe embedding: `<` → \u003c plus the
// U+2028/U+2029 line separators, byte-identical to plain stringify on
// current seed data (no escapable characters exist).
describe("serializeJsonLd", () => {
  it("escapes < so a </script> payload can never break out of the data block", () => {
    const hostile = productJsonLd(
      {
        ...FIXTURE,
        name: '</script><img src=x onerror=alert(1)>',
        description: "a < b and </scr<script>ipt>",
      },
      "https://aurelia.example"
    );
    const html = serializeJsonLd(hostile);
    expect(html).not.toContain("</script");
    expect(html).not.toContain("<img");
    expect(html).toContain("\\u003c/script>");
  });

  it("escapes the U+2028/U+2029 line separators (safe if ever inlined into a classic script)", () => {
    const html = serializeJsonLd({ name: "a b c" });
    expect(html).not.toContain(" ");
    expect(html).not.toContain(" ");
    expect(html).toContain("\\u2028");
    expect(html).toContain("\\u2029");
  });

  it("round-trips through JSON.parse unchanged (data, not shape, is serialized)", () => {
    const ld = productJsonLd(FIXTURE, "https://aurelia.example");
    const parsed = JSON.parse(serializeJsonLd(ld)) as typeof ld;
    expect(parsed).toEqual(ld);
  });

  it("is byte-identical to plain JSON.stringify on current seed data (rest-invariance contract)", () => {
    const ld = productJsonLd(FIXTURE, "https://aurelia.example");
    expect(serializeJsonLd(ld)).toBe(JSON.stringify(ld));
  });
});
