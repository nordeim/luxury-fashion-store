import { db } from "@/lib/db";
import { toProductCardData } from "@/lib/products";
import { StorefrontHome } from "@/components/store/storefront-home";

// Home — parity surface (12 sections in reference order). All product
// selection happens server-side; the client island renders.

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
