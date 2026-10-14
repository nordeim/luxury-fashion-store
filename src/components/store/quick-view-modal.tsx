"use client";

// Quick-view modal — registered superset (the reference's eye button is
// inert). Same design language: white card on black/50 backdrop, serif
// titles, outlined CTAs, size chips with the measured geometry (text-[10px],
// px-2.5 py-1.5, border-border, active = border-foreground).

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTransition } from "react";
import { useStore } from "@/components/store/store-provider";
import { addToCartAction } from "@/lib/actions/cart";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { formatCents } from "@/lib/money";
import type { ProductCardData } from "@/lib/products";

export function QuickViewModal({ product, onClose }: { product: ProductCardData | null; onClose: () => void }) {
  const { setCart, setCartOpen, wishlist, setWishlist } = useStore();
  const [size, setSize] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [sizedForId, setSizedForId] = useState<string | null>(null);

  // Reset the size selection when a different product opens (adjust-during-render —
  // no effect needed; React re-renders immediately after this setState).
  if (product && product.id !== sizedForId) {
    setSizedForId(product.id);
    setSize(product.sizes[0] ?? "");
  }

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  if (!product) return null;

  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const wishlisted = wishlist.has(product.id);

  const addToBag = () => {
    startTransition(async () => {
      const res = await addToCartAction(product.id, size, 1);
      if (res.ok) {
        setCart(res.data);
        onClose();
        setCartOpen(true);
      }
    });
  };

  const toggleWishlist = () => {
    startTransition(async () => {
      const res = await toggleWishlistAction(product.id);
      if (res.ok) {
        const next = new Set(wishlist);
        if (res.data.wishlisted) next.add(product.id);
        else next.delete(product.id);
        setWishlist(next);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Quick view ${product.name}`}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card max-w-3xl w-full grid md:grid-cols-2 shadow-2xl">
        <button
          type="button"
          aria-label="Close quick view"
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground z-10"
        >
          <X size={20} strokeWidth={2} />
        </button>
        <div className="bg-secondary aspect-[3/4] md:aspect-auto md:h-full">
          { }
          <img src={product.images[0] ?? ""} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-8 flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{product.brand}</p>
          <h2 className="font-cormorant text-3xl font-light mb-3">{product.name}</h2>
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-xl font-semibold font-sans">{formatCents(product.price)}</span>
            {onSale && (
              <span className="text-sm text-muted-foreground line-through">{formatCents(product.compareAtPrice ?? 0)}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-montserrat leading-relaxed mb-6">{product.description}</p>
          {product.sizes.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Size</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className={`text-[10px] font-montserrat px-2.5 py-1.5 border transition-colors ${
                      size === s ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-auto flex flex-col gap-3">
            <button
              type="button"
              onClick={addToBag}
              disabled={isPending || product.stock <= 0}
              className="bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-4 hover:bg-accent transition-colors font-montserrat disabled:opacity-50"
            >
              {product.stock > 0 ? "Add to Bag" : "Out of Stock"}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={toggleWishlist}
                className="flex-1 border border-primary text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-primary hover:text-primary-foreground transition-colors font-montserrat"
              >
                {wishlisted ? "In Wishlist" : "Add to Wishlist"}
              </button>
              <Link
                href={`/product/${product.slug}`}
                className="flex-1 border border-border text-center text-xs tracking-[0.2em] uppercase py-3.5 hover:border-foreground transition-colors font-montserrat flex items-center justify-center"
              >
                Full Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
