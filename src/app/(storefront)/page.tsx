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
  });
  const dto = products.map(toProductCardData);
  return <StorefrontHome products={dto} />;
}
