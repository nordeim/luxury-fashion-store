import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseProductImages, toProductCardData } from "@/lib/products";
import { estimateDelivery } from "@/lib/delivery";
import { productJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { ProductDetail } from "@/components/store/product-detail";

// PDP — functional superset (reference /product/* 404s). Same design
// language as the reference home: serif display, size chips, outlined CTAs.

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });
  // F-TT half B (session-49): the isActive guard — generateMetadata ran
  // existence-only while the render 404s, streaming the hidden product's
  // title/og:image/price metas in the flight payload over the 404 body (the
  // browser-resolved DOM title measured leaking; the plan probe's raw-fetch
  // read of the pre-stream shell was the false negative this case caught).
  // Guard BOTH halves exactly like the render's notFound() below.
  if (!product || !product.isActive) return { title: "Product Not Found" };
  // F-K2 (session-24): per-product share cards — the og/twitter image is the
  // piece's first catalog photograph (zero new assets; the CDN is already
  // allowed by images.remotePatterns). Inherits the root card as fallback
  // semantics via metadataBase resolution.
  const images = parseProductImages(product.images);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
    // F-W (session-27): Next merges metadata SHALLOWLY per segment — this
    // child `openGraph` REPLACES the root layout's site-level block
    // wholesale (no deep-merge), which silently dropped og:type /
    // og:site_name / og:url from the served PDP head while every other page
    // carries them (served-bytes verified). Re-declared here. Two documented
    // residuals: og:type stays "website" (the honest type — Next's
    // OpenGraphType union lacks "product", a cast was rejected, session-26)
    // and og:url keeps the site-wide origin convention the root declares for
    // every page (the canonical link above carries the per-page identity).
    // The og:image keeps no type/width/height annotations: the remote
    // catalog URL's dimensions are not statically known (the root card's
    // annotations come from its file-convention PNG).
    openGraph:
      images.length > 0
        ? {
            type: "website",
            siteName: "AURELIA",
            url: siteUrl,
            images: [{ url: images[0] }],
          }
        : undefined,
    // F-V (session-26): the product price on the share surface — the
    // cents→dollars arithmetic the Product JSON-LD unit-pins. Next 16.4's
    // typed escape hatch for custom metas is the TOP-LEVEL `Metadata.other`
    // (renders <meta name="product:price:amount"> — HTML-valid, machine-
    // readable). Two documented residuals: og:type stays "website" (Next's
    // OpenGraphType union lacks "product" — a type-dishonest cast was
    // rejected) and the tags render with the `name` attribute (Next's
    // `other` contract), not OG's conventional `property`. The schema.org
    // Product JSON-LD above remains the authoritative price channel.
    other: {
      "product:price:amount": (product.price / 100).toFixed(2),
      "product:price:currency": "USD",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product || !product.isActive) notFound();

  const related = await db.product.findMany({
    where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
    include: { category: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });

  const card = toProductCardData(product);
  // F-B (session-19): the README has documented the PDP's JSON-LD since the
  // first release — this data block finally ships it. Non-executing data
  // blocks are exempt from CSP script-src (no nonce needed) and are
  // invisible to the resting census.
  const jsonLd = productJsonLd(
    card,
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );

  return (
    <>
      <script
        type="application/ld+json"
        // F-D (session-20): the ONLY dangerouslySetInnerHTML in the codebase
        // embeds HTML-safely — serializeJsonLd escapes `<` (and the U+2028/
        // U+2029 separators) so a `</script>` sequence inside any future
        // product string can never terminate the data block early. On the
        // current seed the output is byte-identical to JSON.stringify
        // (unit-pinned rest-invariance contract).
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ProductDetail
        product={card}
        related={related.map(toProductCardData)}
        // H-37 (session-6): single clock — the label is computed here (server)
        // and passed down, instead of each render environment calling
        // estimateDelivery() with its own `new Date()`.
        deliveryLabel={estimateDelivery().label}
      />
    </>
  );
}
