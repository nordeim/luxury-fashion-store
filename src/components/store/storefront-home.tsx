"use client";

// Home page composition — the reference sections in order (re-measured
// 2026-10-14, session 5 — the brand marquee sits between hero and New
// Arrivals):
// Hero → Brand Marquee → New Arrivals → The Edit → Our Bestsellers →
// Women's Collection → Exclusive Deals → Sale Items → Men's Edit →
// Fine Accessories → Styled by You. (Newsletter + Footer render from the
// group layout.)

import { useState } from "react";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { BrandMarquee } from "@/components/store/brand-marquee";
import { ProductRowSection } from "@/components/store/product-row";
import { CategoryEdit } from "@/components/store/category-edit";
import { ExclusiveDeals } from "@/components/store/exclusive-deals";
import { StyledByYou } from "@/components/store/styled-by-you";
import { QuickViewModal } from "@/components/store/quick-view-modal";
import type { ProductCardData } from "@/lib/products";

export function StorefrontHome({ products }: { products: ProductCardData[] }) {
  const [quickView, setQuickView] = useState<ProductCardData | null>(null);

  const by = (pred: (p: ProductCardData) => boolean) => products.filter(pred);
  const newArrivals = by((p) => p.isNew);
  const bestsellers = by((p) => p.isBestseller);
  const women = by((p) => p.categorySlug === "women");
  const saleItems = by((p) => p.compareAtPrice !== null);
  const men = by((p) => p.categorySlug === "men");
  const accessories = by((p) => p.categorySlug === "accessories");

  return (
    <>
      <HeroCarousel />
      <BrandMarquee />
      <ProductRowSection
        kicker="JUST LANDED"
        title="New Arrivals"
        products={newArrivals}
        viewAllHref="/shop?sort=newest"
        onQuickView={setQuickView}
      />
      <CategoryEdit />
      <ProductRowSection
        kicker="CLIENT FAVOURITES"
        title="Our"
        titleAccent="Bestsellers"
        products={bestsellers}
        viewAllHref="/shop?sort=rating"
        onQuickView={setQuickView}
      />
      <ProductRowSection
        kicker="WOMEN"
        title="Women's"
        titleAccent="Collection"
        products={women}
        viewAllHref="/shop?category=women"
        onQuickView={setQuickView}
      />
      {/* P-9 (session-7): the reference absorbed the sale row INTO the deals
          section (countdown + bento + a 4-col sale grid) — the standalone
          "Sale Items" row is gone from the home. */}
      <ExclusiveDeals products={saleItems} onQuickView={setQuickView} />
      <ProductRowSection
        kicker="MEN"
        title="Men's"
        titleAccent="Edit"
        products={men}
        viewAllHref="/shop?category=men"
        onQuickView={setQuickView}
      />
      <ProductRowSection
        kicker="FINISHING TOUCHES"
        title="Fine"
        titleAccent="Accessories"
        products={accessories}
        viewAllHref="/shop?category=accessories"
        onQuickView={setQuickView}
      />
      <StyledByYou />
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </>
  );
}
