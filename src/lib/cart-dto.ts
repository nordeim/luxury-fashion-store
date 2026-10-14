// Cart/wishlist DTO contract — PURE module (no server imports).
//
// Lives apart from src/lib/cart.ts because that module is server-only
// (next/headers + Prisma). Client components (StoreProvider, checkout flow)
// need the DTO shapes and the EMPTY constants but must never pull the
// server-only implementation into the browser bundle — Turbopack fails the
// build on that trace, and rightly so.

export interface CartLineDto {
  itemId: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  size: string;
  unitPrice: number; // cents
  quantity: number;
  lineTotal: number; // cents
  stock: number;
}

export interface CartDto {
  lines: CartLineDto[];
  count: number;
  subtotal: number; // cents
  shipping: number; // cents
  total: number; // cents
}

export const EMPTY_CART: CartDto = { lines: [], count: 0, subtotal: 0, shipping: 0, total: 0 };

export interface WishlistDto {
  productIds: Set<string>;
}

export const EMPTY_WISHLIST: WishlistDto = { productIds: new Set() };
