"use client";

// Full-page bag — same design language as the drawer at page scale.

import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useStore } from "@/components/store/store-provider";
import { adjustCartItemAction, removeCartItemAction } from "@/lib/actions/cart";
import { formatCents, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/money";

export function CartPageClient() {
  const { cart, setCart } = useStore();
  const [isPending, startTransition] = useTransition();

  const adjust = (itemId: string, delta: number) => {
    startTransition(async () => {
      const res = await adjustCartItemAction(itemId, delta);
      if (res.ok) setCart(res.data);
    });
  };
  const remove = (itemId: string) => {
    startTransition(async () => {
      const res = await removeCartItemAction(itemId);
      if (res.ok) setCart(res.data);
    });
  };

  const toFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotal);

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">YOUR SELECTION</div>
          <h1 className="font-cormorant text-5xl font-light">
            Shopping <span className="italic">Bag</span>
          </h1>
        </div>

        {cart.lines.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-cormorant text-2xl mb-2">Your bag is empty</p>
            <p className="text-sm text-muted-foreground font-montserrat mb-8">Discover our curated collections</p>
            <Link
              href="/shop"
              className="inline-block text-xs tracking-[0.2em] uppercase border border-primary px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-colors font-montserrat"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              {toFreeShipping > 0 && (
                <p className="text-xs font-montserrat text-muted-foreground mb-6">
                  You&apos;re {formatCents(toFreeShipping)} away from complimentary shipping.
                </p>
              )}
              <div className="divide-y divide-border border-y border-border">
                {cart.lines.map((line) => (
                  <div key={line.itemId} className="flex gap-6 py-6">
                    <Link href={`/product/${line.slug}`} className="shrink-0">
                      { }
                      <img src={line.image} alt={line.name} className="w-28 h-36 object-cover rounded-lg bg-secondary" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{line.brand}</p>
                          <Link href={`/product/${line.slug}`} className="font-cormorant text-xl hover:text-gold transition-colors">
                            {line.name}
                          </Link>
                          {line.size && <p className="text-xs text-muted-foreground font-montserrat mt-1">Size: {line.size}</p>}
                        </div>
                        <p className="text-sm font-semibold font-montserrat">{formatCents(line.lineTotal)}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center border border-border">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={isPending}
                            onClick={() => adjust(line.itemId, -1)}
                            className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-9 text-center text-sm font-montserrat">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            disabled={isPending || line.quantity >= line.stock}
                            onClick={() => adjust(line.itemId, 1)}
                            className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(line.itemId)}
                          className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-montserrat text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="h-fit bg-card border border-border p-8">
              <h2 className="font-cormorant text-2xl font-light mb-6">Order Summary</h2>
              <div className="flex flex-col gap-3 text-sm font-montserrat">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCents(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{cart.shipping === 0 ? "Complimentary" : formatCents(cart.shipping)}</span>
                </div>
                <div className="flex justify-between font-cormorant text-xl font-medium pt-3 border-t border-border">
                  <span>Total</span>
                  <span>{formatCents(cart.total)}</span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="mt-8 bg-primary text-primary-foreground text-center text-xs tracking-[0.2em] uppercase py-4 hover:bg-accent transition-colors font-montserrat flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight size={14} />
              </Link>
              <Link
                href="/shop"
                className="mt-3 text-center text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors font-montserrat block"
              >
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
