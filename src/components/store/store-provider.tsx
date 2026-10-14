"use client";

// StoreProvider — the single client state seam (ADR: one context, no other
// state hooks). Server truth (cart/user/wishlist) is initialized from server
// props and RE-SYNCED from server action responses — never optimistic local
// math. UI-only state (drawers/overlays) lives here too.
//
// React-Compiler note: props re-sync uses the adjust-state-during-render
// pattern ("last seen props" held in state, not refs) — setState in an
// effect is a compiler error in this stack.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CartDto } from "@/lib/cart-dto";
import { EMPTY_CART } from "@/lib/cart-dto";

export interface StoreUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface StoreContextValue {
  cart: CartDto;
  user: StoreUser | null;
  wishlist: Set<string>;
  hydrated: boolean;
  cartOpen: boolean;
  mobileNavOpen: boolean;
  searchOpen: boolean;
  setCart: (cart: CartDto) => void;
  setUser: (user: StoreUser | null) => void;
  setWishlist: (ids: Set<string>) => void;
  setCartOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

interface StoreProviderProps {
  children: React.ReactNode;
  initialCart: CartDto;
  initialUser: StoreUser | null;
  initialWishlist: string[];
}

export function StoreProvider({ children, initialCart, initialUser, initialWishlist }: StoreProviderProps) {
  const [cart, setCartState] = useState<CartDto>(initialCart);
  const [lastCartProps, setLastCartProps] = useState<CartDto>(initialCart);
  const [user, setUser] = useState<StoreUser | null>(initialUser);
  const [lastUserProp, setLastUserProp] = useState<StoreUser | null>(initialUser);
  const [wishlist, setWishlistState] = useState<Set<string>>(new Set(initialWishlist));
  const [lastWishlistProp, setLastWishlistProp] = useState<string[]>(initialWishlist);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Adjust-state-during-render: when router.refresh() delivers new server
  // props (identity change), re-sync the client cache. Server truth wins.
  if (initialCart !== lastCartProps) {
    setLastCartProps(initialCart);
    setCartState(initialCart);
  }
  if (initialUser !== lastUserProp) {
    setLastUserProp(initialUser);
    setUser(initialUser);
  }
  if (initialWishlist !== lastWishlistProp) {
    setLastWishlistProp(initialWishlist);
    setWishlistState(new Set(initialWishlist));
  }

  const setCart = useCallback((next: CartDto) => setCartState(next), []);
  const setWishlist = useCallback((ids: Set<string>) => setWishlistState(ids), []);

  const value = useMemo<StoreContextValue>(
    () => ({
      cart,
      user,
      wishlist,
      hydrated: true,
      cartOpen,
      mobileNavOpen,
      searchOpen,
      setCart,
      setUser,
      setWishlist,
      setCartOpen,
      setMobileNavOpen,
      setSearchOpen,
    }),
    [cart, user, wishlist, cartOpen, mobileNavOpen, searchOpen, setCart, setWishlist],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { EMPTY_CART };
