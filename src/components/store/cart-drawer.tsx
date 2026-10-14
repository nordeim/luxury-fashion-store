"use client";

// Cart drawer — parity surface (measured live 2026-10-14):
// panel: fixed right-0 top-0 h-full w-full max-w-md bg-background z-50 flex flex-col
// backdrop: fixed inset-0 bg-black/50 backdrop-blur-sm z-50
// header: px-6 py-5 border-b — h2 font-cormorant text-xl "Shopping Bag" +
// "N items" text-xs muted + X 20px. Empty state: 64px bordered circle with
// bag icon, "Your bag is empty" (font-cormorant text-xl), "Discover our
// curated collections", Continue Shopping outline CTA.

import { X, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useStore } from "@/components/store/store-provider";
import { adjustCartItemAction, removeCartItemAction } from "@/lib/actions/cart";
import { installFocusTrap } from "@/lib/focus-trap";
import { formatCents } from "@/lib/money";

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setCart } = useStore();
  const [isPending, startTransition] = useTransition();
  // H-6 (session-5): mutation failures (vanished line, ownership) surface
  // here instead of leaving stale UI silently in place.
  const [actionError, setActionError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // H-26 (session-6): the drawer is a hand-rolled dialog — move focus into
    // the panel, trap Tab inside it, restore focus to the opener on close.
    const trap = panelRef.current ? installFocusTrap(panelRef.current) : null;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trap?.();
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;

  const adjust = (itemId: string, delta: number) => {
    startTransition(async () => {
      const res = await adjustCartItemAction(itemId, delta);
      if (res.ok) {
        setActionError(null);
        setCart(res.data);
      } else {
        setActionError(res.error.message);
      }
    });
  };

  const remove = (itemId: string) => {
    startTransition(async () => {
      const res = await removeCartItemAction(itemId);
      if (res.ok) {
        setActionError(null);
        setCart(res.data);
      } else {
        setActionError(res.error.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50" data-testid="cart-drawer">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-background z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-cormorant text-xl font-medium">Shopping Bag</h2>
            <p className="text-xs text-muted-foreground font-montserrat mt-0.5" data-testid="cart-count">
              {cart.count} {cart.count === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close bag"
            onClick={() => setCartOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-6 flex flex-col gap-5">
          {actionError && (
            <p className="text-xs text-red-600 font-montserrat" role="alert">
              {actionError}
            </p>
          )}
          {cart.lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 border-2 border-border rounded-full flex items-center justify-center">
                <ShoppingBag className="text-muted-foreground" size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="font-cormorant text-xl">Your bag is empty</p>
                <p className="text-xs text-muted-foreground font-montserrat mt-1">
                  Discover our curated collections
                </p>
              </div>
              <Link
                href="/shop"
                onClick={() => setCartOpen(false)}
                className="mt-2 text-xs tracking-[0.2em] uppercase border border-primary px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-colors font-montserrat"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            cart.lines.map((line) => (
              <div key={line.itemId} className="flex gap-4">
                <Link href={`/product/${line.slug}`} onClick={() => setCartOpen(false)} className="shrink-0">
                  <img src={line.image} alt={line.name} className="w-20 h-24 object-cover rounded-lg bg-secondary" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{line.brand}</p>
                      <Link
                        href={`/product/${line.slug}`}
                        onClick={() => setCartOpen(false)}
                        className="font-cormorant text-lg leading-tight hover:text-gold transition-colors"
                      >
                        {line.name}
                      </Link>
                      {line.size && <p className="text-xs text-muted-foreground font-montserrat mt-0.5">Size: {line.size}</p>}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => remove(line.itemId)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={isPending}
                        onClick={() => adjust(line.itemId, -1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-montserrat" data-testid={`qty-${line.itemId}`}>
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={isPending || line.quantity >= line.stock}
                        onClick={() => adjust(line.itemId, 1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-semibold font-montserrat">{formatCents(line.lineTotal)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.lines.length > 0 && (
          <div className="border-t border-border px-6 py-5 flex flex-col gap-3">
            <div className="flex justify-between text-sm font-montserrat">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCents(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-montserrat">
              <span className="text-muted-foreground">Shipping</span>
              <span>{cart.shipping === 0 ? "Complimentary" : formatCents(cart.shipping)}</span>
            </div>
            <div className="flex justify-between font-cormorant text-lg font-medium pt-2 border-t border-border">
              <span>Total</span>
              <span>{formatCents(cart.total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={() => setCartOpen(false)}
              className="mt-2 bg-primary text-primary-foreground text-center text-xs tracking-[0.2em] uppercase py-4 hover:bg-accent transition-colors font-montserrat"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/cart"
              onClick={() => setCartOpen(false)}
              className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors font-montserrat"
            >
              View Bag
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
