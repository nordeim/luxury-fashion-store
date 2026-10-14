"use client";

// Product row section — parity surface for New Arrivals / Our Bestsellers /
// Women's Collection / Sale Items / Men's Edit / Fine Accessories:
// header row (kicker gold + h2 serif with italic accents + arrows + VIEW ALL)
// + horizontal scroll row of FIXED-WIDTH product cards (re-measured live
// 2026-10-14, P-4 session-5: the reference cards are `flex-shrink-0
// w-[260px] lg:w-[280px]` in a `flex gap-6 overflow-x-auto hide-scrollbar
// pb-4` row — 4.5 cards visible @1280; the old 25%-width fill measured 302px
// and rendered every section 39px short). The reference paginates with
// prev/next arrows; the clone scrolls with the same arrow chrome — same
// visual, working behavior (snap kept as a functional superset).
//
// Tailwind v4 note: the scroll row uses flex + snap; the section header is a
// plain flex row (no space-y pitfalls).

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { ProductCard } from "@/components/store/product-card";
import type { ProductCardData } from "@/lib/products";

export interface ProductRowSectionProps {
  kicker: string;
  title: string;
  titleAccent?: string;
  titleAccentItalic?: boolean;
  products: ProductCardData[];
  viewAllHref: string;
  onQuickView?: (product: ProductCardData) => void;
}

export function ProductRowSection({
  kicker,
  title,
  titleAccent,
  titleAccentItalic = true,
  products,
  viewAllHref,
  onQuickView,
}: ProductRowSectionProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    // One card + gap at the current viewport (cards are 2-col mobile /
    // 4-col desktop of the container width).
    const card = el.querySelector<HTMLElement>("[data-product-card]");
    const delta = card ? (card.offsetWidth + 24) * 2 : el.clientWidth / 2;
    el.scrollBy({ left: dir * delta, behavior: "smooth" });
  };

  return (
    <section className="py-20 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">{kicker}</div>
            <h2 className="font-cormorant text-4xl lg:text-5xl font-light">
              {title}
              {titleAccent && (
                <>
                  {" "}
                  <span className={titleAccentItalic ? "italic" : ""}>{titleAccent}</span>
                </>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`Scroll ${title} back`}
              onClick={() => scrollBy(-1)}
              className="w-10 h-10 border border-border text-foreground flex items-center justify-center hover:border-foreground transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} forward`}
              onClick={() => scrollBy(1)}
              className="w-10 h-10 border border-foreground text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
            <Link
              href={viewAllHref}
              className="ml-2 text-xs tracking-[0.3em] uppercase font-montserrat text-muted-foreground hover:text-foreground border-b border-transparent hover:border-foreground transition-all"
            >
              View All
            </Link>
          </div>
        </div>
        <div
          ref={scroller}
          className="flex gap-4 lg:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="product-row"
        >
          {products.map((product) => (
            <div
              key={product.id}
              data-product-card
              className="w-[calc(50%-8px)] md:w-[calc(33.333%-16px)] lg:w-[280px] shrink-0 snap-start"
            >
              <ProductCard product={product} onQuickView={onQuickView} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
