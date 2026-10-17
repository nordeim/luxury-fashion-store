import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toProductCardData } from "@/lib/products";
import { StorefrontHome } from "@/components/store/storefront-home";

// F-T (session-26): the reference ships a canonical on its home page
// (measured `…/` with the trailing slash, 2026-10-17). Title/description
// stay unset — the root default renders byte-identical ("AURELIA").
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Home — parity surface (12 sections in reference order). All product
// selection happens server-side; the client island renders.
//
// F-N (session-25): the WebSite + Organization JSON-LD lives in the
// (storefront) layout, NOT here — the layout composes the page outside
// <main>, and body-embedded data blocks inside main would register as
// main children (h-0 secs entries) and break the census's byte-equality
// ritual (caught first-hand by the round-20b sweep — mainKids 10→12).
// WebSite/Organization are SITE-level entities, so layout-level rendering
// is also the schema.org-correct placement.

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { sortOrder: "asc" },
    take: 60, // F-19 (session-3): bounded read; the catalog is 12 today
  });
  const dto = products.map(toProductCardData);
  return <StorefrontHome products={dto} />;
}
