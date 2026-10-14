"use client";

// "Styled by You" — parity surface (cream bg): VELOUR LOOKBOOK kicker,
// "Styled by *You*" h2, 4-col grid of UGC cards (image + tag + title + desc
// on hover gradient). Re-measured live 2026-10-14 (P-6 session-5): grid gap-4
// (16px, tighter than product rows' gap-6), tiles aspect-[3/4]; subtitle
// "Tag @velour in your looks to be featured".

import { UGC_CARDS } from "@/lib/data/catalog";

export function StyledByYou() {
  return (
    <section className="py-20 px-6 lg:px-10 bg-cream" data-testid="styled-by-you">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">VELOUR LOOKBOOK</div>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-light">
            Styled by <span className="italic">You</span>
          </h2>
          <p className="text-sm text-muted-foreground font-montserrat mt-3 max-w-md mx-auto">
            Tag @velour in your looks to be featured
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {UGC_CARDS.map((card) => (
            <div key={card.tag} className="group relative overflow-hidden aspect-[3/4] cursor-pointer">
              { }
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />
              <div className="absolute bottom-5 left-5 text-white">
                <div className="text-[10px] tracking-[0.25em] uppercase font-montserrat text-white/80 mb-1">
                  {card.tag}
                </div>
                <h3 className="font-cormorant text-xl font-light">{card.title}</h3>
                <p className="text-xs text-white/70 font-montserrat mt-0.5">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
