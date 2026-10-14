import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWishlistDto } from "@/lib/cart";
import { toProductCardData } from "@/lib/products";
import { WishlistClient } from "@/components/store/wishlist-client";

export const metadata: Metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const wishlist = await getWishlistDto(user?.id ?? null);
  const ids = Array.from(wishlist.productIds);
  const products = ids.length
    ? await db.product.findMany({
        where: { id: { in: ids }, isActive: true },
        include: { category: true },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return <WishlistClient products={products.map(toProductCardData)} />;
}
