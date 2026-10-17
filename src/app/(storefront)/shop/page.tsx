import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toProductCardData } from "@/lib/products";
import { firstParam } from "@/lib/search-params";
import { ShopClient } from "@/components/store/shop-client";

export const metadata: Metadata = {
  title: "Shop",
  description: "Discover the full AURELIA collection — women, men, accessories and shoes.",
  // F-T (session-26): the indexable statics carry canonicals (the PDP has
  // since its metadata shipped).
  alternates: { canonical: "/shop" },
};

// PLP — functional superset (the reference /shop 404s). Filters deep-link
// via searchParams: ?category= &search= &price= &sort= &sale=1 &designers=1

export const dynamic = "force-dynamic";

interface ShopPageProps {
  searchParams: Promise<{ category?: string; search?: string; price?: string; sort?: string; sale?: string; designers?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  // H-1 (session-5): repeated query keys arrive as string[] — coerce each.
  const params = await searchParams;
  const category = firstParam(params.category);
  const search = firstParam(params.search);
  const price = firstParam(params.price);
  const sort = firstParam(params.sort);
  const sale = firstParam(params.sale);
  const designers = firstParam(params.designers);
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { sortOrder: "asc" },
    take: 60, // F-19 (session-3): bounded read; the catalog is 12 today
  });
  return (
    <ShopClient
      products={products.map(toProductCardData)}
      initial={{
        category: category ?? "",
        search: search ?? "",
        price: price ?? "",
        sort: sort ?? "featured",
        sale: sale === "1",
        designers: designers === "1",
      }}
    />
  );
}
