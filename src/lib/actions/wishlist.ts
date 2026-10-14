"use server";

// Wishlist mutations: toggle (add when absent, remove when present).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateWishlist } from "@/lib/cart";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export interface WishlistToggleResult {
  wishlisted: boolean;
}

export async function toggleWishlistAction(productId: string): Promise<ActionResult<WishlistToggleResult>> {
  const user = await getCurrentUser();
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return fail("This piece is no longer available.");

  const wishlistId = await getOrCreateWishlist(user?.id ?? null);
  const existing = await db.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId, productId } },
  });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/", "layout");
    return ok({ wishlisted: false });
  }
  await db.wishlistItem.create({ data: { wishlistId, productId } });
  revalidatePath("/", "layout");
  return ok({ wishlisted: true });
}
