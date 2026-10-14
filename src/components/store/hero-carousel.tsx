"use client";

// Hero carousel — parity surface (re-measured live 2026-10-14, sessions 5–6):
// section relative w-full h-[70vh] lg:h-[90vh] overflow-hidden bg-primary;
// slides: bg-cover bg-center + bg-gradient-to-r from-black/60 via-black/20
// to-transparent; content block `text-white max-w-lg` inside a
// `flex items-center px-10 lg:px-20` layer whose justify flips PER SLIDE from
// slide.align — slide 1 anchors LEFT (justify-start + text-left), slide 2
// anchors RIGHT (justify-end + text-left), and slide 3 anchors CENTER
// (P-8, session-6 re-measure: justify-center + text-center; the CTA centers
// via text-align on the inline-block link).
//
// Transition (P-2): the reference PUSHES slides horizontally — each wrapper
// sits at translateX((i - active) * 100%) with a 700ms ease; the active slide
// rests at identity. Inactive slides are inert (H-13: no focusable content
// hidden from AT).
//
// Chrome: arrows w-10 h-10 border-white/50; dots w-2 h-[2px] (active w-8
// bg-white); counter bottom-right "01 / 03". Auto-rotates every 6s.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "@/lib/data/catalog";

const AUTO_ROTATE_MS = 6000;

const JUSTIFY: Record<HeroSlideAlign, string> = {
  left: "justify-start",
  right: "justify-end",
  center: "justify-center",
};

const COPY_ALIGN: Record<HeroSlideAlign, string> = {
  left: "text-left",
  right: "text-left",
  center: "text-center",
};

type HeroSlideAlign = (typeof HERO_SLIDES)[number]["align"];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = HERO_SLIDES.length;

  const go = useCallback(
    (next: number) => {
      setActive(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    timer.current = setInterval(() => setActive((a) => (a + 1) % count), AUTO_ROTATE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count]);

  const manual = (next: number) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setActive((a) => (a + 1) % count), AUTO_ROTATE_MS);
    go(next);
  };

  return (
    <section className="relative w-full h-[70vh] lg:h-[90vh] overflow-hidden bg-primary" data-testid="hero-carousel">
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-transform duration-700"
          style={{ transform: `translateX(${(i - active) * 100}%)` }}
          aria-hidden={i !== active}
          inert={i !== active}
          data-active={i === active}
          data-testid={`hero-slide-${i}`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${s.image}")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          <div className={`absolute inset-0 flex items-center ${JUSTIFY[s.align]} px-10 lg:px-20`}>
            <div className={`text-white max-w-lg ${COPY_ALIGN[s.align]}`} data-testid={`hero-content-${i}`}>
              <div className="text-xs tracking-[0.4em] font-light mb-4 text-white/70 font-montserrat">{s.accent}</div>
              <h2 className="font-cormorant text-6xl lg:text-8xl font-light leading-none mb-2">{s.title}</h2>
              <h3 className="font-cormorant text-5xl lg:text-7xl font-light italic leading-none mb-6">{s.subtitle}</h3>
              <p className="text-sm font-light tracking-wider text-white/80 font-montserrat mb-10 max-w-sm">
                {s.description}
              </p>
              <a
                href="/shop"
                className="inline-block border border-white text-white text-xs tracking-[0.3em] uppercase px-10 py-4 hover:bg-white hover:text-black transition-all duration-300 font-montserrat"
              >
                {s.cta}
              </a>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => manual(active - 1)}
        className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-10 h-10 border border-white/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => manual(active + 1)}
        className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-10 h-10 border border-white/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => manual(i)}
            className={`transition-all duration-300 h-[2px] ${i === active ? "w-8 bg-white" : "w-2 bg-white/40"}`}
          />
        ))}
      </div>
      <div className="absolute bottom-8 right-10 text-white/70 text-xs tracking-[0.3em] font-montserrat z-10">
        {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
      </div>
    </section>
  );
}
