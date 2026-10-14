"use client";

// Site header — parity surface (measured live 2026-10-14):
// sticky top-0 z-50 bg-background · h-16 lg:h-20 · max-w-screen-xl px-6 lg:px-10
// left: hamburger (lg:hidden) + nav dropdowns · center: VELOUR logo +
// PARIS · MILAN · NEW YORK · right: DESIGNERS / SALE (gold) + search, heart,
// bag (badge), user icons.
//
// Tailwind v4 trap pin: the desktop dropdown uses CSS group-hover (as the
// reference does); the MOBILE menu is a portal'd Sheet (see mobile-nav.tsx) —
// nesting a fixed drawer inside this header would be confined by any
// backdrop-filter containing block.

import Link from "next/link";
import { ChevronDown, Heart, Search, ShoppingBag, User, Menu } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { NAV_MENUS } from "@/lib/data/catalog";

export function Header() {
  const { cart, user, setCartOpen, setMobileNavOpen, setSearchOpen, wishlist } = useStore();

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
        <div className="relative flex items-center justify-between h-16 lg:h-20">
          {/* Left: mobile burger + desktop dropdown nav */}
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Open menu"
              className="lg:hidden text-foreground"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={22} strokeWidth={2} />
            </button>
            <nav className="hidden lg:flex items-center gap-8" aria-label="Main">
              {NAV_MENUS.filter((m) => m.label !== "Designers" && m.label !== "Sale").map((menu) => (
                <div key={menu.label} className="relative group">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs tracking-[0.15em] font-medium uppercase text-foreground hover:text-gold transition-colors py-2"
                  >
                    {menu.label}
                    <ChevronDown size={12} strokeWidth={2} />
                  </button>
                  <div className="absolute top-full left-0 bg-card border border-border shadow-xl py-4 px-6 min-w-[160px] z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {menu.sub.map((item) => (
                      <Link
                        key={item}
                        href={`/shop?category=${menu.label.toLowerCase()}&search=${encodeURIComponent(item)}`}
                        className="block py-1.5 text-xs tracking-widest text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Center: logo */}
          <Link href="/" aria-label="AURELIA home" className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="font-cormorant text-2xl lg:text-3xl font-light tracking-[0.3em] text-foreground leading-none">
              VELOUR
            </h1>
            <p className="hidden lg:block text-[10px] tracking-[0.4em] text-muted-foreground mt-1.5 font-montserrat">
              PARIS · MILAN · NEW YORK
            </p>
          </Link>

          {/* Right: text links + icon cluster */}
          <div className="flex items-center gap-5 lg:gap-8">
            <nav className="hidden lg:flex items-center gap-8" aria-label="Secondary">
              <Link
                href="/shop?designers=1"
                className="text-xs tracking-[0.15em] font-medium uppercase text-foreground hover:text-gold transition-colors py-2"
              >
                Designers
              </Link>
              <Link
                href="/shop?sale=1"
                className="text-xs tracking-[0.15em] font-medium uppercase text-gold hover:text-foreground transition-colors py-2"
              >
                Sale
              </Link>
            </nav>
            <div className="flex items-center gap-4 lg:gap-5">
              <button
                type="button"
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
                className="text-foreground hover:text-gold transition-colors"
              >
                <Search size={18} strokeWidth={1.8} />
              </button>
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="relative text-foreground hover:text-gold transition-colors"
              >
                <Heart size={18} strokeWidth={1.8} />
                {wishlist.size > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gold text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-montserrat font-medium">
                    {wishlist.size}
                  </span>
                )}
              </Link>
              <button
                type="button"
                aria-label="Shopping bag"
                onClick={() => setCartOpen(true)}
                className="relative text-foreground hover:text-gold transition-colors"
              >
                <ShoppingBag size={18} strokeWidth={1.8} />
                {cart.count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gold text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-montserrat font-medium">
                    {cart.count}
                  </span>
                )}
              </button>
              <Link
                href={user ? "/account" : "/login"}
                aria-label={user ? "Account" : "Sign in"}
                className="text-foreground hover:text-gold transition-colors hidden sm:block"
              >
                <User size={18} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

