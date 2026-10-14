"use client";

// "Exclusive Deals" — parity surface (cream bg): 2-col grid — left featured
// card (aspect-[4/3] lg:stretch, bottom-left copy, top-right red disc badge)
// + right column of 2 stacked horizontal cards with left gradient overlays.

import Link from "next/link";
import { FEATURED_DEAL, SECONDARY_DEALS } from "@/lib/data/catalog";

export function ExclusiveDeals() {
  const featured = FEATURED_DEAL;
  return (
    <section className="py-20 bg-cream px-6 lg:px-10" data-testid="exclusive-deals">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">MEMBERS-ONLY PRICING</div>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-light">
            Exclusive <span className="italic">Deals</span>
          </h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Featured deal */}
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
          {/* Two stacked deals */}
          <div className="grid grid-rows-2 gap-6">
            {SECONDARY_DEALS.map((deal) => (
              <div key={deal.kicker} className="relative overflow-hidden min-h-[220px]">
                <img src={deal.image} alt={`${deal.kicker} deal`} className="w-full h-full object-cover absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-center px-8">
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
      </div>
    </section>
  );
}
