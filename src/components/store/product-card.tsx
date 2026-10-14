"use client";

// Product card — PARITY SURFACE (classes byte-identical to the reference,
// measured live 2026-10-14). Structure:
//   div.group.relative
//     div.relative.overflow-hidden.bg-secondary.aspect-[3/4].rounded-lg
//       img (object-cover, duration-700 group-hover:scale-105)
//       hover overlay bg-black/0 group-hover:bg-black/10 duration-500
//       hover action row: Add to Bag (flex-1) + quick-view (w-10 h-10)
//       wishlist heart (top-3 right-3, w-9 h-9 rounded-full)
//     div.mt-4: brand kicker / name / stars+reviews / price row
//
// Working functionality (the reference's handlers are inert — registered
// superset): Add to Bag posts a server action; the heart toggles the DB
// wishlist; the eye opens the quick-view modal.

import { Heart, Eye, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useStore } from "@/components/store/store-provider";
import { addToCartAction } from "@/lib/actions/cart";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { formatCents } from "@/lib/money";
import type { ProductCardData } from "@/lib/products";

export interface ProductCardProps {
  product: ProductCardData;
  onQuickView?: (product: ProductCardData) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { setCart, setCartOpen, wishlist, setWishlist } = useStore();
  const [isPending, startTransition] = useTransition();
  const wishlisted = wishlist.has(product.id);
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;

  const addToBag = () => {
    startTransition(async () => {
      const res = await addToCartAction(product.id, product.sizes[0] ?? "", 1);
      if (res.ok) {
        setCart(res.data);
        setCartOpen(true);
      }
    });
  };

  const toggleWishlist = () => {
    startTransition(async () => {
      const res = await toggleWishlistAction(product.id);
      if (res.ok) {
        // F-11: read the previous set inside the updater — never the render-time snapshot.
        setWishlist((prev) => {
          const next = new Set(prev);
          if (res.data.wishlisted) next.add(product.id);
          else next.delete(product.id);
          return next;
        });
      }
    });
  };

  return (
    <div className="group relative">
      <div className="relative overflow-hidden bg-secondary aspect-[3/4] rounded-lg">
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          { }
          <img
            src={product.images[0] ?? ""}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500 pointer-events-none" />
        {product.tag && (
          <span
            className={`absolute top-3 left-3 text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 font-montserrat font-medium ${
              product.tag === "SALE" ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
            }`}
          >
            {product.tag}
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <button
            type="button"
            onClick={addToBag}
            disabled={isPending}
            className="flex-1 bg-primary text-primary-foreground py-2.5 font-body font-sans text-xs uppercase tracking-wider hover:bg-accent hover:text-accent-foreground transition-all flex items-center justify-center gap-2 rounded-sm disabled:opacity-60"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Add to Bag
          </button>
          <button
            type="button"
            aria-label={`Quick view ${product.name}`}
            onClick={() => onQuickView?.(product)}
            className="bg-background/90 backdrop-blur-sm text-foreground w-10 h-10 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all rounded-sm"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wishlisted}
          onClick={toggleWishlist}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-all"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${wishlisted ? "fill-red-600 text-red-600" : "text-foreground/60"}`}
          />
        </button>
      </div>
      <div className="mt-4">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{product.brand}</p>
        <h3 className="font-sans font-medium text-foreground leading-snug mb-2 text-sm">
          <Link href={`/product/${product.slug}`} className="hover:text-gold transition-colors">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i <= Math.round(product.rating) ? "fill-accent text-accent" : "text-border"}`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-montserrat">({product.reviewCount})</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-base font-semibold text-foreground">{formatCents(product.price)}</span>
          {onSale && (
            <span className="font-sans text-xs text-muted-foreground line-through">
              {formatCents(product.compareAtPrice ?? 0)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
