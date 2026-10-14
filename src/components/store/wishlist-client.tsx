"use client";

// Wishlist page — functional superset (the reference's heart icon is inert).

import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import type { ProductCardData } from "@/lib/products";

export function WishlistClient({ products }: { products: ProductCardData[] }) {
  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">SAVED PIECES</div>
          <h1 className="font-cormorant text-5xl font-light">
            Your <span className="italic">Wishlist</span>
          </h1>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-cormorant text-2xl mb-2">Nothing saved yet</p>
            <p className="text-sm text-muted-foreground font-montserrat mb-8">
              Tap the heart on any piece to save it for later.
            </p>
            <Link
              href="/shop"
              className="inline-block text-xs tracking-[0.2em] uppercase border border-primary px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-colors font-montserrat"
            >
              Discover the Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6" data-testid="wishlist-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
