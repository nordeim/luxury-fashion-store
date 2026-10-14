"use client";

// Checkout — 3-step wizard (Shipping → Payment → Review) in the reference
// design language. All money math shown here mirrors the server-derived
// cart DTO; the authoritative totals are re-derived inside placeOrderAction.

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, startTransition, useEffect, useState } from "react";
import { useStore } from "@/components/store/store-provider";
import { placeOrderAction } from "@/lib/actions/checkout";
import type { ActionResult, PlacedOrderResult } from "@/lib/actions/checkout-types";
import type { CartDto } from "@/lib/cart-dto";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

const STEPS = ["Shipping", "Payment", "Review"] as const;

interface Prefill {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function CheckoutFlow({
  cart,
  user,
  defaultAddress,
}: {
  cart: CartDto;
  user: { email: string; name: string } | null;
  defaultAddress: Prefill | null;
}) {
  const router = useRouter();
  const { setCart } = useStore();
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState<"card" | "cod">("card");
  const [shipping, setShipping] = useState<Prefill>({
    fullName: defaultAddress?.fullName ?? user?.name ?? "",
    street: defaultAddress?.street ?? "",
    city: defaultAddress?.city ?? "",
    state: defaultAddress?.state ?? "",
    zip: defaultAddress?.zip ?? "",
    country: defaultAddress?.country ?? "United States",
  });
  const email = user?.email ?? "";
  const [emailInput, setEmailInput] = useState(email);
  // Card details live in STATE, not the DOM: the step-2 review unmounts the
  // step-1 inputs, so reading them by id at submit time would always see
  // null (and every card order would fail Luhn). Controlled inputs keep the
  // values alive across wizard steps.
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });

  const [state, formAction, isPending] = useActionState<ActionResult<PlacedOrderResult> | null, FormData>(
    placeOrderAction,
    null,
  );

  // F-2 (session-3): the button follows the action's real pending state — the
  // old fixed 4s setTimeout re-enabled it mid-flight on slow requests, opening
  // a double-submit window (duplicate orders / double stock reads).
  const placing = isPending;

  useEffect(() => {
    if (state?.ok) {
      setCart({ lines: [], count: 0, subtotal: 0, shipping: 0, total: 0 });
      const { number, viewToken } = state.data;
      router.push(viewToken ? `/checkout/success?order=${number}&t=${viewToken}` : `/checkout/success?order=${number}`);
    }
  }, [state, router, setCart]);

  const shippingValid =
    shipping.fullName.trim() &&
    shipping.street.trim() &&
    shipping.city.trim() &&
    shipping.state.trim() &&
    shipping.zip.trim() &&
    (user || emailInput.trim());

  const next = () => {
    if (step === 0 && !shippingValid) return;
    setStep((s) => Math.min(2, s + 1));
  };

  const submit = () => {
    // Build FormData for the server action (single transactional seam).
    const fd = new FormData();
    fd.set("email", user ? email : emailInput);
    fd.set("fullName", shipping.fullName);
    fd.set("street", shipping.street);
    fd.set("city", shipping.city);
    fd.set("state", shipping.state);
    fd.set("zip", shipping.zip);
    fd.set("country", shipping.country);
    fd.set("paymentMethod", payment);
    if (payment === "card") {
      fd.set("cardNumber", card.number);
      fd.set("cardExpiry", card.expiry);
      fd.set("cardCvc", card.cvc);
    }
    // React contract: async action fns must dispatch inside a transition —
    // a bare call skips pending state and drops the result update.
    startTransition(() => formAction(fd));
  };

  const inputCls =
    "w-full bg-transparent border border-border px-4 py-3 text-sm font-montserrat focus:outline-none focus:border-foreground placeholder:text-muted-foreground/60";
  const labelCls = "block text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5";

  return (
    <div className="py-14 px-6 lg:px-10">
      <div className="max-w-screen-lg mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.4em] text-gold font-montserrat mb-3">SECURE CHECKOUT</div>
          <h1 className="font-cormorant text-5xl font-light">
            Complete Your <span className="italic">Order</span>
          </h1>
        </div>

        {/* Stepper */}
        <ol className="flex items-center justify-center gap-4 mb-12" aria-label="Checkout progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              <span
                className={cn(
                  "w-7 h-7 rounded-full border text-[10px] font-montserrat flex items-center justify-center",
                  i < step && "bg-primary text-primary-foreground border-primary",
                  i === step && "border-foreground text-foreground",
                  i > step && "border-border text-muted-foreground",
                )}
                aria-current={i === step ? "step" : undefined}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </span>
              <span className={cn("text-[10px] tracking-[0.25em] uppercase font-montserrat", i === step ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="w-10 h-[1px] bg-border" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            {step === 0 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-cormorant text-2xl font-light">Shipping Address</h2>
                {!user && (
                  <div>
                    <label className={labelCls} htmlFor="co-email">Email</label>
                    <input
                      id="co-email"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                )}
                <div>
                  <label className={labelCls} htmlFor="co-name">Full Name</label>
                  <input id="co-name" required value={shipping.fullName} onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })} className={inputCls} autoComplete="name" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="co-street">Street Address</label>
                  <input id="co-street" required value={shipping.street} onChange={(e) => setShipping({ ...shipping, street: e.target.value })} className={inputCls} autoComplete="street-address" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="co-city">City</label>
                    <input id="co-city" required value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} className={inputCls} autoComplete="address-level2" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="co-state">State</label>
                    <input id="co-state" required value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} className={inputCls} autoComplete="address-level1" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="co-zip">ZIP</label>
                    <input id="co-zip" required value={shipping.zip} onChange={(e) => setShipping({ ...shipping, zip: e.target.value })} className={inputCls} autoComplete="postal-code" />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="co-country">Country</label>
                  <input id="co-country" value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })} className={inputCls} autoComplete="country-name" />
                </div>
                <button
                  type="button"
                  onClick={next}
                  disabled={!shippingValid}
                  className="mt-4 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-4 hover:bg-accent transition-colors font-montserrat disabled:opacity-40"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-cormorant text-2xl font-light">Payment</h2>
                <label className={cn("flex items-start gap-3 border p-5 cursor-pointer transition-colors", payment === "card" ? "border-foreground" : "border-border hover:border-muted-foreground")}>
                  <input type="radio" name="payment" checked={payment === "card"} onChange={() => setPayment("card")} className="mt-1 accent-black" />
                  <span>
                    <span className="block text-xs tracking-[0.2em] uppercase font-montserrat">Credit Card</span>
                    <span className="block text-xs text-muted-foreground font-montserrat mt-1">Visa, Mastercard, Amex — demo processor, no real charge</span>
                  </span>
                </label>
                {payment === "card" && (
                  <div className="flex flex-col gap-4 pl-1">
                    <div>
                      <label className={labelCls} htmlFor="cc-number">Card Number</label>
                      <input id="cc-number" inputMode="numeric" placeholder="4242 4242 4242 4242" className={inputCls} autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls} htmlFor="cc-expiry">Expiry (MM/YY)</label>
                        <input id="cc-expiry" placeholder="12/28" className={inputCls} autoComplete="cc-exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="cc-cvc">CVC</label>
                        <input id="cc-cvc" inputMode="numeric" placeholder="123" className={inputCls} autoComplete="cc-csc" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}
                <label className={cn("flex items-start gap-3 border p-5 cursor-pointer transition-colors", payment === "cod" ? "border-foreground" : "border-border hover:border-muted-foreground")}>
                  <input type="radio" name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} className="mt-1 accent-black" />
                  <span>
                    <span className="block text-xs tracking-[0.2em] uppercase font-montserrat">Cash on Delivery</span>
                    <span className="block text-xs text-muted-foreground font-montserrat mt-1">Pay the courier upon arrival</span>
                  </span>
                </label>
                {state && !state.ok && (
                  <p className="text-xs text-red-600 font-montserrat" role="alert">{state.error.message}</p>
                )}
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setStep(0)} className="flex-1 border border-border text-xs tracking-[0.2em] uppercase py-4 hover:border-foreground transition-colors font-montserrat">
                    Back
                  </button>
                  <button type="button" onClick={next} className="flex-1 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-4 hover:bg-accent transition-colors font-montserrat">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <h2 className="font-cormorant text-2xl font-light">Review</h2>
                <div className="border border-border p-5 text-sm font-montserrat">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">Ship to</p>
                      <p>{shipping.fullName}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{shipping.street}, {shipping.city}, {shipping.state} {shipping.zip}, {shipping.country}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{user ? email : emailInput}</p>
                    </div>
                    <button type="button" onClick={() => setStep(0)} className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground underline underline-offset-4 hover:text-foreground">
                      Edit
                    </button>
                  </div>
                  <div className="flex justify-between items-start mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">Payment</p>
                      <p className="capitalize">{payment === "cod" ? "Cash on Delivery" : "Credit Card"}</p>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground underline underline-offset-4 hover:text-foreground">
                      Edit
                    </button>
                  </div>
                </div>
                {state && !state.ok && (
                  <div className="flex flex-col gap-2" role="alert">
                    <p className="text-xs text-red-600 font-montserrat">{state.error.message}</p>
                    {/* H-5 (session-5): the action computes field-level errors
                        (card fields are validated server-side at submit time,
                        on this step) — render them, or "Check the highlighted
                        fields" highlights nothing. */}
                    {state.error.fieldErrors && (
                      <ul className="text-xs text-red-600 font-montserrat list-disc pl-4">
                        {Object.entries(state.error.fieldErrors).map(([field, message]) => (
                          <li key={field}>
                            <span className="capitalize">{field.replace(/([A-Z])/g, " $1")}</span>: {message}
                          </li>
                        ))}
                      </ul>
                    )}
                    {state.error.fieldErrors &&
                      Object.keys(state.error.fieldErrors).some((f) => f.startsWith("card")) && (
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-montserrat text-muted-foreground underline underline-offset-4 hover:text-foreground w-fit"
                        >
                          Edit payment details
                        </button>
                      )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 border border-border text-xs tracking-[0.2em] uppercase py-4 hover:border-foreground transition-colors font-montserrat">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={placing}
                    className="flex-1 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase py-4 hover:bg-accent transition-colors font-montserrat disabled:opacity-50"
                  >
                    {placing ? "Placing Order…" : "Place Order"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary rail */}
          <aside className="lg:col-span-2 h-fit bg-card border border-border p-7">
            <h2 className="font-cormorant text-xl font-light mb-5">Your Order</h2>
            <div className="flex flex-col gap-4 mb-6">
              {cart.lines.map((line) => (
                <div key={line.itemId} className="flex gap-3">
                  <img src={line.image} alt="" className="w-14 h-16 object-cover rounded-sm bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-montserrat font-medium truncate">{line.name}</p>
                    <p className="text-[10px] text-muted-foreground font-montserrat">Qty {line.quantity}{line.size ? ` · ${line.size}` : ""}</p>
                  </div>
                  <p className="text-xs font-montserrat font-semibold">{formatCents(line.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 text-sm font-montserrat border-t border-border pt-4">
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
          </aside>
        </div>
      </div>
    </div>
  );
}
