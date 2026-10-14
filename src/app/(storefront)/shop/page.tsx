import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toProductCardData } from "@/lib/products";
import { ShopClient } from "@/components/store/shop-client";

export const metadata: Metadata = {
  title: "Shop",
  description: "Discover the full AURELIA collection — women, men, accessories and shoes.",
};

// PLP — functional superset (the reference /shop 404s). Filters deep-link
// via searchParams: ?category= &search= &price= &sort= &sale=1 &designers=1

export const dynamic = "force-dynamic";

interface ShopPageProps {
  searchParams: Promise<{ category?: string; search?: string; price?: string; sort?: string; sale?: string; designers?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <ShopClient
      products={products.map(toProductCardData)}
      initial={{
        category: params.category ?? "",
        search: params.search ?? "",
        price: params.price ?? "",
        sort: params.sort ?? "featured",
        sale: params.sale === "1",
        designers: params.designers === "1",
      }}
    />
  );
}
