"use client";

// PDP client island: breadcrumb, 2-col gallery + buy panel, description /
// details accordion rows, related products. Buy panel = the quick-view's
// design language at full size (measured chips: text-[10px] px-2.5 py-1.5
// border; primary CTA; outline wishlist CTA).

import { Heart, Minus, Plus, Star, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useStore } from "@/components/store/store-provider";
import { ProductCard } from "@/components/store/product-card";
import { addToCartAction } from "@/lib/actions/cart";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { formatCents } from "@/lib/money";
import type { ProductCardData } from "@/lib/products";

export function ProductDetail({
  product,
  related,
  deliveryLabel,
}: {
  product: ProductCardData;
  related: ProductCardData[];
  deliveryLabel: string;
}) {
  const { setCart, setCartOpen, wishlist, setWishlist } = useStore();
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [qty, setQty] = useState(1);
  const [imageIdx, setImageIdx] = useState(0);
  const [isPending, startTransition] = useTransition();
  // H-6 (session-5): action failures used to vanish — surface them inline.
  const [actionError, setActionError] = useState<string | null>(null);
  // H-37 (session-6): the delivery label is computed ONCE in the RSC page and
  // passed down — the old `estimateDelivery()` call here ran on BOTH the
  // server render and the client hydration from independent `new Date()`
  // clocks, so a render straddling the UTC day boundary hydrated a different
  // label (text mismatch). Single clock now.
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const wishlisted = wishlist.has(product.id);

  const addToBag = (openDrawer: boolean) => {
    startTransition(async () => {
      const res = await addToCartAction(product.id, size, qty);
      if (res.ok) {
        setActionError(null);
        setCart(res.data);
        if (openDrawer) setCartOpen(true);
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
    <div className="py-10 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-montserrat mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-foreground transition-colors">
            {product.categorySlug}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Gallery */}
          <div className="flex flex-col-reverse md:flex-row gap-4">
            <div className="flex md:flex-col gap-3 shrink-0">
              {product.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setImageIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={imageIdx === i}
                  className={`w-16 h-20 overflow-hidden border transition-colors ${imageIdx === i ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="flex-1 bg-secondary aspect-[3/4] rounded-lg overflow-hidden">
              <img src={product.images[imageIdx] ?? product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Buy panel */}
          <div>
            {/* Session-8 hygiene: the PDP is a superset surface (the
                reference has no PDP) but speaks the same card language —
                sale products carry the -{discount}% red-500 chip (the old
                red-600 "SALE" word and gold fill stars diverged from the
                P-10 card stack one click away). */}
            {product.tag === "SALE" && onSale ? (
              <span className="inline-block bg-red-500 text-white text-[10px] font-montserrat font-medium px-2 py-0.5 mb-4">
                -{product.discount}%
              </span>
            ) : (
              product.tag && (
                <span className="inline-block text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 font-montserrat font-medium mb-4 bg-primary text-primary-foreground">
                  {product.tag}
                </span>
              )
            )}
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{product.brand}</p>
            <h1 className="font-cormorant text-4xl lg:text-5xl font-light mb-4">{product.name}</h1>
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center" aria-hidden="true">
                {/* Card-language stars: 16px stroke glyphs in
                    muted-foreground (P-10) — not the old gold fill. */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-montserrat">
                {product.rating} · {product.reviewCount} reviews
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-2xl font-semibold font-sans">{formatCents(product.price)}</span>
              {onSale && (
                <>
                  <span className="text-base text-muted-foreground line-through">{formatCents(product.compareAtPrice ?? 0)}</span>
                  <span className="bg-red-500 text-white text-[10px] tracking-widest uppercase px-2 py-0.5 font-montserrat font-bold">
                    -{product.discount}%
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground font-montserrat leading-relaxed mb-8 max-w-md">{product.description}</p>

            {product.sizes.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Size</div>
                  <button type="button" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      aria-pressed={size === s}
                      className={`text-[10px] font-montserrat px-2.5 py-1.5 border transition-colors min-w-[44px] ${
                        size === s ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Color</div>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <span key={c} className="text-[10px] font-montserrat px-2.5 py-1.5 border border-border text-muted-foreground">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Qty + CTAs */}
            <div className="flex gap-3 mb-3">
              <div className="flex items-center border border-border shrink-0">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="w-11 h-12 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-montserrat" aria-live="polite">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  className="w-11 h-12 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => addToBag(true)}
                disabled={isPending || product.stock <= 0}
                className="flex-1 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-4 hover:bg-accent transition-colors font-montserrat disabled:opacity-50"
              >
                {product.stock > 0 ? "Add to Bag" : "Out of Stock"}
              </button>
            </div>
            {/* H-6 (session-5): action failures (sold out under you, vanished
                line, wishlist errors) surface here instead of vanishing. */}
            {actionError && (
              <p className="text-xs text-red-600 font-montserrat mb-3" role="alert" data-testid="pdp-action-error">
                {actionError}
              </p>
            )}
            <div className="flex gap-3 mb-8">
              <button
                type="button"
                onClick={toggleWishlist}
                className="flex-1 border border-primary text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-primary hover:text-primary-foreground transition-colors font-montserrat flex items-center justify-center gap-2"
              >
                <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
                {wishlisted ? "In Wishlist" : "Add to Wishlist"}
              </button>
            </div>

            {/* Service rows */}
            <div className="border-t border-border divide-y divide-border text-xs font-montserrat text-muted-foreground">
              <div className="flex items-center gap-3 py-3">
                <Truck size={15} strokeWidth={1.8} />
                Complimentary shipping on orders over $500 — arrives {deliveryLabel}
              </div>
              <div className="flex items-center gap-3 py-3">
                <RotateCcw size={15} strokeWidth={1.8} />
                Free returns within 30 days
              </div>
              <div className="flex items-center gap-3 py-3">
                <ShieldCheck size={15} strokeWidth={1.8} />
                Authenticity guaranteed · {product.stock > 0 ? `${product.stock} in stock` : "Currently out of stock"}
              </div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-24">
            <div className="text-center mb-10">
              <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">COMPLETE THE LOOK</div>
              <h2 className="font-cormorant text-4xl font-light">
                You May Also <span className="italic">Like</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
