"use client";

// Footer — parity surface (measured live 2026-10-14): bg-primary
// text-primary-foreground pt-20 pb-10; grid lg:grid-cols-5; brand column
// (VELOUR tracking-[0.3em], PARIS · MILAN · NEW YORK, since-1987 copy,
// 3 social square buttons w-9 h-9 border) + CUSTOMER CARE / OUR WORLD /
// LEGAL link columns; bottom bar with © 2026 line and payment badges.
//
// The reference's footer links are inert (#) — registered divergence: the
// clone routes Customer Care links to real content pages.

import Link from "next/link";
import { Instagram, Facebook, Youtube } from "lucide-react";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Customer Care",
    links: [
      { label: "Size Guide", href: "/shop" },
      { label: "Shipping & Returns", href: "/shop" },
      { label: "Track Your Order", href: "/account" },
      { label: "Contact Us", href: "mailto:care@aurelia.com" },
      { label: "FAQs", href: "/shop" },
    ],
  },
  {
    heading: "Our World",
    links: [
      { label: "About Velour", href: "/shop" },
      { label: "Sustainability", href: "/shop" },
      { label: "Careers", href: "/shop" },
      { label: "Press", href: "/shop" },
      { label: "Stockists", href: "/shop" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/shop" },
      { label: "Terms of Service", href: "/shop" },
      { label: "Cookie Policy", href: "/shop" },
      { label: "Accessibility", href: "/shop" },
    ],
  },
];

const PAYMENTS = ["VISA", "MC", "AMEX", "PAYPAL"];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground pt-20 pb-10">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8 pb-16 border-b border-primary-foreground/10">
          <div className="lg:col-span-2">
            <h2 className="font-cormorant text-4xl font-light tracking-[0.3em] mb-2">VELOUR</h2>
            <div className="text-[10px] tracking-[0.4em] text-primary-foreground/40 font-montserrat mb-6">
              PARIS · MILAN · NEW YORK
            </div>
            <p className="text-sm text-primary-foreground/60 font-montserrat leading-relaxed max-w-xs mb-8">
              Crafting timeless luxury since 1987. Each piece is a testament to the finest artisanship.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                aria-label="Instagram"
                className="w-9 h-9 border border-primary-foreground/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
              >
                <Instagram size={16} strokeWidth={2} />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="w-9 h-9 border border-primary-foreground/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
              >
                <Facebook size={16} strokeWidth={2} />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="w-9 h-9 border border-primary-foreground/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
              >
                <Youtube size={16} strokeWidth={2} />
              </a>
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[10px] tracking-[0.3em] uppercase font-montserrat mb-5 text-primary-foreground/80">
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-primary-foreground/50 hover:text-primary-foreground transition-colors font-montserrat"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-[10px] tracking-[0.2em] text-primary-foreground/40 font-montserrat uppercase">
            © 2026 Velour. All rights reserved.
          </p>
          <div className="flex gap-2">
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="text-[9px] tracking-widest text-primary-foreground/40 border border-primary-foreground/15 px-2.5 py-1 font-montserrat"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
