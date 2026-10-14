// Server-side cart domain: guest-token resolution, DTO shaping, totals.
//
// Invariants (inherited from the repo family):
// - Guest identity = 192-bit httpOnly cookie token (`aurelia_cart`).
// - READS never mint rows (RSC can't set cookies) — a missing cookie means
//   an empty cart DTO, nothing more.
// - MUTATIONS may create the cart + cookie.
// - Totals are always re-derived server-side from the DB rows.

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { shippingForSubtotal } from "@/lib/money";

// DTO contract lives in the pure module (client-safe); re-exported here so
// server-side callers keep their single import seam.
export type { CartLineDto, CartDto, WishlistDto } from "@/lib/cart-dto";
export { EMPTY_CART, EMPTY_WISHLIST } from "@/lib/cart-dto";
import { EMPTY_CART, EMPTY_WISHLIST } from "@/lib/cart-dto";
import type { CartDto, CartLineDto, WishlistDto } from "@/lib/cart-dto";
import { firstImage } from "@/lib/image";

export const CART_COOKIE = "aurelia_cart";
export const WISHLIST_COOKIE = "aurelia_wishlist";

export function deriveCartTotals(lines: CartLineDto[]): CartDto {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const shipping = lines.length === 0 ? 0 : shippingForSubtotal(subtotal);
  return { lines, count, subtotal, shipping, total: subtotal + shipping };
}

/** Load the current cart (user-owned or guest cookie) as a DTO. Never mints rows. */
export async function getCartDto(userId: string | null): Promise<CartDto> {
  const cart = await findCart(userId);
  if (!cart) return EMPTY_CART;
  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
  const lines: CartLineDto[] = items.map((i) => ({
    itemId: i.id,
    productId: i.productId,
    slug: i.product.slug,
    name: i.product.name,
    brand: i.product.brand,
    image: firstImage(i.product.images),
    size: i.size,
    unitPrice: i.product.price,
    quantity: i.quantity,
    lineTotal: i.product.price * i.quantity,
    stock: i.product.stock,
  }));
  return deriveCartTotals(lines);
}

export async function getWishlistDto(userId: string | null): Promise<WishlistDto> {
  const wishlist = await findWishlist(userId);
  if (!wishlist) return EMPTY_WISHLIST;
  const items = await db.wishlistItem.findMany({ where: { wishlistId: wishlist.id } });
  return { productIds: new Set(items.map((i) => i.productId)) };
}

export async function findCart(userId: string | null) {
  if (userId) {
    return db.cart.findUnique({ where: { userId } });
  }
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findUnique({ where: { token } });
}

export async function findWishlist(userId: string | null) {
  if (userId) {
    return db.wishlist.findUnique({ where: { userId } });
  }
  const store = await cookies();
  const token = store.get(WISHLIST_COOKIE)?.value;
  if (!token) return null;
  return db.wishlist.findUnique({ where: { token } });
}

/** Mutation-side: get or create the cart for user or guest (mints the cookie). */
export async function getOrCreateCart(userId: string | null): Promise<string> {
  if (userId) {
    const existing = await db.cart.findUnique({ where: { userId } });
    if (existing) return existing.id;
    // token is the row's unique identity — user carts keep a minted token
    // so the row remains addressable before/after guest->user claiming.
    const created = await db.cart.create({
      data: { userId, token: randomBytes(24).toString("hex") },
    });
    return created.id;
  }
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await db.cart.findUnique({ where: { token } });
    if (existing) return existing.id;
  }
  const newToken = randomBytes(24).toString("hex"); // 192-bit
  const created = await db.cart.create({ data: { token: newToken } });
  store.set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return created.id;
}

export async function getOrCreateWishlist(userId: string | null): Promise<string> {
  if (userId) {
    const existing = await db.wishlist.findUnique({ where: { userId } });
    if (existing) return existing.id;
    const created = await db.wishlist.create({
      data: { userId, token: randomBytes(24).toString("hex") },
    });
    return created.id;
  }
  const store = await cookies();
  const token = store.get(WISHLIST_COOKIE)?.value;
  if (token) {
    const existing = await db.wishlist.findUnique({ where: { token } });
    if (existing) return existing.id;
  }
  const newToken = randomBytes(24).toString("hex");
  const created = await db.wishlist.create({ data: { token: newToken } });
  store.set(WISHLIST_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return created.id;
}

/**
 * Merge the guest cart into the user's cart at login (quantity-max union).
 * The guest cart row is deleted; the user keeps their single cart.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return;
  const guestCart = await db.cart.findUnique({ where: { token }, include: { items: true } });
  if (!guestCart) return;
  if (guestCart.userId === userId) return;

  const userCart = await db.cart.upsert({
    where: { userId },
    update: {},
    create: { userId, token: randomBytes(24).toString("hex") },
  });
  // F-13 (session-3): one transaction + stock clamp — the old per-item loop
  // could partially fail (merged items, guest cart left behind → duplicates),
  // and merged quantities were never clamped against product stock.
  const productIds = [...new Set(guestCart.items.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, stock: true },
  });
  const stockById = new Map(products.map((p) => [p.id, p.stock]));
  await db.$transaction(async (tx) => {
    for (const item of guestCart.items) {
      const stock = stockById.get(item.productId);
      if (stock === undefined || stock <= 0) continue; // product gone or unbuyable
      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId_size: { cartId: userCart.id, productId: item.productId, size: item.size } },
      });
      const mergedQty = Math.max(1, Math.min(Math.max(existing?.quantity ?? 0, item.quantity), stock));
      if (existing) {
        await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: mergedQty } });
      } else {
        await tx.cartItem.create({
          data: { cartId: userCart.id, productId: item.productId, size: item.size, quantity: mergedQty },
        });
      }
    }
  });
  await db.cart.delete({ where: { id: guestCart.id } }).catch(() => undefined);
  // G-5 (session-4): the cookie is cleared only AFTER the merge committed.
  // Deleting it before the transaction (session-3 shape) orphaned the guest
  // cart on a tx failure (SQLITE_BUSY under WAL contention) — the browser
  // would drop its only reference to recoverable items.
  store.delete(CART_COOKIE);
}

/** Same union for wishlists at login. */
export async function mergeGuestWishlistIntoUser(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(WISHLIST_COOKIE)?.value;
  if (!token) return;
  const guestList = await db.wishlist.findUnique({ where: { token }, include: { items: true } });
  if (!guestList) return;
  if (guestList.userId === userId) return;

  const userList = await db.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId, token: randomBytes(24).toString("hex") },
  });
  for (const item of guestList.items) {
    await db.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: userList.id, productId: item.productId } },
      update: {},
      create: { wishlistId: userList.id, productId: item.productId },
    });
  }
  await db.wishlist.delete({ where: { id: guestList.id } }).catch(() => undefined);
  // G-5 (session-4): same cookie-after-work rule as the cart merge — the
  // cookie is the browser's only reference to the guest list, so it must
  // outlive any mid-merge failure.
  store.delete(WISHLIST_COOKIE);
}
