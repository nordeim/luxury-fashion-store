"use client";

// Mobile navigation — PARITY-CRITICAL (Tailwind v4 trap pin #5).
//
// The reference panel is measured exactly as:
//   fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6
//   header row: flex justify-between items-center (VELOUR text-2xl + X 20px)
//   nav: flex flex-col gap-5 mt-4
//   items: text-sm tracking-[0.2em] uppercase font-medium cursor-pointer
//          hover:text-gold transition-colors  (plain divs, wrapped in <div>)
//
// ⚠️ v4 TRAP: the nav MUST stack with `flex flex-col gap-5` — never
// `space-y-5` (v4's :where() rewrite changes row geometry; measured live:
// the reference itself uses gap-5). Regression-pinned by
// tests/e2e/mobile-navigation.spec.ts (gap + row-height assertions).

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useStore } from "@/components/store/store-provider";
import { installFocusTrap } from "@/lib/focus-trap";
import { NAV_MENUS } from "@/lib/data/catalog";

export function MobileNav() {
  const { mobileNavOpen, setMobileNavOpen } = useStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes; body scroll locks while open (matches a modal drawer).
  // H-26 (session-6): focus moves into the panel, Tab is trapped inside it,
  // and the opener regains focus on close.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const trap = panelRef.current ? installFocusTrap(panelRef.current) : null;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trap?.();
    };
  }, [mobileNavOpen, setMobileNavOpen]);

  if (!mobileNavOpen) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="mobile-nav">
      {/* Backdrop — plain bg-black/50 (no blur; measured on the reference). */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />
      {/* Panel — flex gap-6, NOT space-y (v4 trap pin #5). */}
      <div
        ref={panelRef}
        className="fixed left-0 top-0 h-full w-80 bg-background z-50 p-8 flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="flex justify-between items-center">
          <span className="font-cormorant text-2xl tracking-widest">VELOUR</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="text-foreground hover:text-gold transition-colors"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {/* flex flex-col gap-5 — the pinned v4-safe stack (never space-y-5). */}
        <nav className="flex flex-col gap-5 mt-4" aria-label="Mobile">
          {NAV_MENUS.map((menu) => (
            <div key={menu.label}>
              <Link
                href={menu.label === "Designers" ? "/shop?designers=1" : menu.label === "Sale" ? "/shop?sale=1" : `/shop?category=${menu.label.toLowerCase()}`}
                className="block text-sm tracking-[0.2em] uppercase font-medium cursor-pointer hover:text-gold transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                {menu.label}
              </Link>
            </div>
          ))}
          {/* P-12 (session-8): the reference REMOVED its ACCOUNT/WISHLIST
              tail (measured live — the panel is now the logotype + the five
              inert menus, gaps [20,20,20,20]); the tail's 7-item geometry
              [20,20,20,20,29,20] from session 6/7 no longer exists to pin.
              Parity law wins: the tail is gone. Account/wishlist stay
              reachable (header heart, /account, checkout) — superset URLs,
              documented in the remediation plan. If the reference re-adds a
              tail, restore ours and re-pin 7 items. */}
        </nav>
      </div>
    </div>
  );
}
