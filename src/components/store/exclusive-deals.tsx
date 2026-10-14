"use client";

// "Exclusive Deals" — PARITY SURFACE, rebuilt to the reference's current
// design (P-9, session-7, measured live 2026-10-15; the section had grown
// from a 767px promo band to a 3549px composite). Structure:
//
//   section.py-20.bg-cream
//     header (LEFT-aligned, measured from the reference evidence shots):
//       kicker "LIMITED TIME OFFER" (10px gold, ls 4px)
//       h2 "Exclusive *Deals*" (60px serif) + copy line
//     countdown row: "SALE ENDS IN" label ↔ 3 ink digit boxes (P-9)
//     bento: lg:grid-cols-2 — LEFT tall women tile (aspect-[4/3] mobile,
//       lg:aspect-auto stretch; bottom-left copy, white CTA, -40% circle
//       badge) | RIGHT grid-rows-2 (men, accessories — 3:4 mobile / 2:3
//       desktop 628×942 measured; the LEFT tile stretches to their 1908px
//       combined height; left gradient, h3 30px, "Shop Now →" border-b CTA)
//     sale area: "Sale Items" (30px serif) + "View All Sale" header row
//       + lg:grid-cols-4 grid of the catalog's sale products (302×403 tiles,
//       6 of them = every compareAtPrice product), each a full ProductCard
//
// Superset: the reference's View All Sale is an inert button — the clone
// links to /shop?sale=1; the countdown ticks real seconds (their own value
// is mount-relative, measured — see sale-countdown.tsx); Add to Bag on the
// grid's cards posts real server actions.

import Link from "next/link";
import { FEATURED_DEAL, SECONDARY_DEALS } from "@/lib/data/catalog";
import type { ProductCardData } from "@/lib/products";
import { ProductCard } from "@/components/store/product-card";
import { SaleCountdown } from "@/components/store/sale-countdown";

export function ExclusiveDeals({
  products,
  onQuickView,
}: {
  products: ProductCardData[];
  onQuickView?: (product: ProductCardData) => void;
}) {
  const featured = FEATURED_DEAL;
  return (
    <section className="py-20 bg-cream px-6 lg:px-10" data-testid="exclusive-deals">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-10">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">LIMITED TIME OFFER</div>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-light">
            Exclusive <span className="italic">Deals</span>
          </h2>
          <p className="text-sm font-montserrat text-muted-foreground mt-3">
            Curated luxury at exceptional value. Each piece, a statement.
          </p>
        </div>

        {/* P-9: the live countdown row — label left, digit boxes right. */}
        <SaleCountdown />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-14">
          {/* Tall featured deal (women) — stretches to the right column's height. */}
          <div className="relative overflow-hidden aspect-[4/3] lg:aspect-auto">
            <img src={featured.image} alt="featured deal" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-8 left-8 text-white">
              <div className="text-xs tracking-[0.3em] font-montserrat text-white/70 mb-2">{featured.kicker}</div>
              <h3 className="font-cormorant text-4xl font-light mb-2">{featured.title}</h3>
              <p className="text-sm font-montserrat text-white/80 mb-5">{featured.copy}</p>
              <Link
                href={`/shop?category=${featured.category}`}
                className="inline-block bg-white text-black text-xs tracking-[0.25em] uppercase px-8 py-3 hover:bg-gold hover:text-white transition-colors font-montserrat"
              >
                {featured.cta}
              </Link>
            </div>
            <div className="absolute top-6 right-6 bg-red-600 text-white text-sm font-bold w-14 h-14 rounded-full flex items-center justify-center font-montserrat">
              {featured.discount}
            </div>
          </div>
          {/* Two stacked deals (men, accessories) — 3:4 on mobile, left
              gradient, copy bottom-left on mobile / vertically centered on
              desktop (measured). */}
          <div className="grid grid-rows-2 gap-6">
            {SECONDARY_DEALS.map((deal) => (
              <div key={deal.kicker} className="relative overflow-hidden aspect-[3/4] lg:aspect-[2/3]">
                <img src={deal.image} alt={`${deal.kicker} deal`} className="w-full h-full object-cover absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-end lg:items-center px-8 pb-6 lg:pb-0">
                  <div className="text-white">
                    <div className="text-xs tracking-widest font-montserrat text-white/70 mb-1">{deal.kicker}</div>
                    <h3 className="font-cormorant text-3xl font-light">{deal.title}</h3>
                    <Link
                      href={`/shop?category=${deal.category}`}
                      className="inline-block mt-3 text-xs tracking-[0.25em] uppercase font-montserrat border-b border-white/60 pb-0.5 hover:text-gold hover:border-gold transition-colors"
                    >
                      Shop Now →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* P-9: the sale area lives INSIDE the deals section now — the
            standalone "Sale Items" row is gone from the home. */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-cormorant text-3xl font-light">Sale Items</h3>
          <Link
            href="/shop?sale=1"
            className="text-xs font-montserrat text-muted-foreground hover:text-foreground transition-colors"
          >
            View All Sale
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6" data-testid="sale-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
          ))}
        </div>
      </div>
    </section>
  );
}
