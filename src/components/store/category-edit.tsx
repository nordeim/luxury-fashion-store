"use client";

// "The Edit" category cards — parity surface: 4-col grid (2-col mobile),
// aspect-[3/4] image cards (re-measured live 2026-10-14, P-5 session-5:
// 302×403 = 3:4; the old aspect-[4/5] rendered the section 25px short) with
// bottom gradient, serif label, "N pieces", "Shop Now →". Links to
// /shop?category=… (working superset; the reference card handlers are inert).

import Link from "next/link";
import { CATEGORY_CARDS } from "@/lib/data/catalog";

export function CategoryEdit() {
  return (
    <section className="py-20 px-6 lg:px-10" data-testid="the-edit">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">SHOP BY CATEGORY</div>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-light">
            The <span className="italic">Edit</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {CATEGORY_CARDS.map((card) => (
            <Link
              key={card.id}
              href={`/shop?category=${card.id}`}
              className="group relative overflow-hidden aspect-[3/4] block"
            >
              { }
              <img
                src={card.image}
                alt={card.label}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 text-white">
                <h3 className="font-cormorant text-2xl font-light mb-0.5">{card.label}</h3>
                <p className="text-xs text-white/70 font-montserrat">{card.count} pieces</p>
                <span className="inline-block mt-2 text-xs tracking-[0.15em] uppercase font-montserrat border-b border-transparent group-hover:border-white transition-all">
                  Shop Now →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
