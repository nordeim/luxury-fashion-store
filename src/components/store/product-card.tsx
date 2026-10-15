"use client";

// Product card — PARITY SURFACE (classes byte-identical to the reference,
// re-measured live 2026-10-15, P-10 session-7 + P-11 session-8: the card text
// stack is brand / NAME / stroke stars+(89) / price+compareAt / COLOR
// SWATCHES / SIZE CHIPS — no "NEW" chip anywhere; sale cards carry a
// `-{discount}%` red-500 chip top-left on the image). Structure:
//   div.group.relative
//     div.relative.overflow-hidden.bg-secondary.aspect-[3/4].rounded-lg
//       img (object-cover, duration-700 group-hover:scale-105)
//       hover overlay bg-black/0 group-hover:bg-black/10 duration-500
//       sale chip: -{discount}% (bg-red-500, top-3 left-3, square)
//       hover action row: Add to Bag (flex-1) + quick-view (w-10 h-10)
//       wishlist heart (top-3 right-3, w-9 h-9 rounded-full)
//     div.mt-4: brand kicker / name / stroke stars+reviews / price row /
//       swatches / size chips (P-11: one bordered button per product size —
//       text-[10px] px-2.5 py-1 border-border text-muted-foreground, square,
//       transparent bg; measured on every reference card incl. "One Size")
//
// Working functionality (the reference's handlers are inert — registered
// superset): Add to Bag posts a server action; the heart toggles the DB
// wishlist; the eye opens the quick-view modal; clicking a size chip selects
// the size Add to Bag posts (resting = unselected, exactly like the
// reference's uniform muted chips).

import { Heart, Eye, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useStore } from "@/components/store/store-provider";
import { addToCartAction } from "@/lib/actions/cart";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { COLOR_HEX } from "@/lib/data/catalog";
import { formatCents } from "@/lib/money";
import type { ProductCardData } from "@/lib/products";

export interface ProductCardProps {
  product: ProductCardData;
  onQuickView?: (product: ProductCardData) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { setCart, setCartOpen, wishlist, setWishlist } = useStore();
  const [isPending, startTransition] = useTransition();
  // H-6 (session-5): a sold-out-under-you add must not look like a no-op.
  const [actionError, setActionError] = useState<string | null>(null);
  // P-11 (session-8) superset: the size the card's Add to Bag posts — null
  // until a chip is clicked (resting visuals = the reference's uniform
  // unselected chips); sizes[0] remains the default post.
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const wishlisted = wishlist.has(product.id);
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;

  const addToBag = () => {
    startTransition(async () => {
      const res = await addToCartAction(product.id, selectedSize ?? product.sizes[0] ?? "", 1);
      if (res.ok) {
        setActionError(null);
        setCart(res.data);
        setCartOpen(true);
      } else {
        setActionError(res.error.message);
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
      } else {
        setActionError(res.error.message);
      }
    });
  };

  return (
    <div className="group relative" data-product-card>
      <div className="relative overflow-hidden bg-secondary aspect-[3/4] rounded-lg">
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          <img
            src={product.images[0] ?? ""}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500 pointer-events-none" />
        {/* P-10 (session-7): the reference's on-image chip is the DISCOUNT
            (-32%, red-500, square) — not the word "SALE", and isNew products
            carry no chip at all (re-measured on New Arrivals + the sale
            grid). */}
        {onSale && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-montserrat font-medium px-2 py-0.5">
            -{product.discount}%
          </span>
        )}
        {/* H-48 (session-7): focus-within reveal — the focus trap restores
            focus to the opener (the eye button); without this the focused
            control stays invisible until hover. Resting visuals unchanged. */}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-300">
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
        {actionError && (
          <p className="text-xs text-red-600 font-montserrat mb-1" role="alert">
            {actionError}
          </p>
        )}
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{product.brand}</p>
        {/* P-15 (session-9): the reference maps EVERY heading — card-name
            h3s included — to the display serif (census: 40/40 h1/h2/h3 are
            Cormorant Garamond; its font-body utility only covers non-heading
            elements). The Montserrat name wrapped at the 163px mobile
            sale-grid tiles (+61px deals drift, mis-classified as content
            variance in session 8). font-medium/leading-snug/text-sm match the
            reference's 14px/500/19.25px line box. */}
        <h3 className="font-cormorant font-medium text-foreground leading-snug mb-2 text-sm">
          <Link href={`/product/${product.slug}`} className="hover:text-gold transition-colors">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center" aria-hidden="true">
            {/* P-10: the reference's stars are 16px STROKE glyphs in
                muted-foreground — no fill distinction, no gold. */}
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-montserrat">({product.reviewCount})</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-sans text-base font-semibold text-foreground">{formatCents(product.price)}</span>
          {onSale && (
            <span className="font-sans text-sm text-muted-foreground line-through">
              {formatCents(product.compareAtPrice ?? 0)}
            </span>
          )}
        </div>
        {/* P-10: the color swatch row — w-4 h-4 border chips filled from the
            product's colors (names → hex via the catalog map; unknown names
            render border-only, exactly like the reference's transparent
            chips). */}
        {product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {product.colors.slice(0, 5).map((color, i) => (
              <span
                key={`${color}-${i}`}
                title={color}
                aria-label={`Color ${color}`}
                className="w-4 h-4 rounded-full border border-border hover:scale-125 transition-transform"
                style={{ backgroundColor: COLOR_HEX[color] ?? "transparent" }}
              />
            ))}
          </div>
        )}
        {/* P-11 (session-8): the SIZE-CHIP row — one bordered button per
            product size, measured on EVERY reference card (10px / px-2.5
            py-1 / border-border / muted-foreground / square / transparent).
            Superset: clicking selects the size Add to Bag posts; the
            selected chip gains border-foreground + ink text (the resting
            grid stays uniform, matching the reference). */}
        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={selectedSize === size}
                onClick={() => setSelectedSize((prev) => (prev === size ? null : size))}
                className={`font-body text-[10px] px-2.5 py-1 border transition-colors ${
                  selectedSize === size
                    ? "border-foreground text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
