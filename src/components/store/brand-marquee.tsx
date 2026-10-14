"use client";

// Brand marquee — parity surface (measured live 2026-10-14, P-3 session-5):
// container `border-y border-border py-5 overflow-hidden bg-background` (h=70
// under the hero); track `flex animate-marquee whitespace-nowrap` — 30s linear
// infinite, keyframes translateX(0 → -50%) over the DOUBLED brand list for a
// seamless loop; item `inline-flex items-center gap-8 mx-8`; brand span 18px
// fw300 tracking-[0.3em] (5.4px @18px) muted taupe rgb(126,113,103);
// separator ◆ 18px gold rgb(224,169,41). The reference's strip is purely
// decorative (no links) — kept decorative here; aria-hidden (it duplicates
// the brand names already visible on the cards below).

import { BRAND_MARQUEE } from "@/lib/data/catalog";

export function BrandMarquee() {
  return (
    <div className="border-y border-border py-5 overflow-hidden bg-background" data-testid="brand-marquee" aria-hidden="true">
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {BRAND_MARQUEE.map((brand) => (
              <span key={`${copy}-${brand}`} className="inline-flex items-center gap-8 mx-8">
                <span className="text-lg font-light tracking-[0.3em] text-muted-foreground font-montserrat">
                  {brand}
                </span>
                <span className="text-lg text-gold" role="presentation">
                  ◆
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
