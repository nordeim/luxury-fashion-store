// Money seam — integer cents everywhere; formatted only at display.
//
// The reference announcement bar pins the shipping policy:
// "COMPLIMENTARY SHIPPING ON ORDERS OVER $500 · FREE RETURNS".

export const FLAT_SHIPPING_CENTS = 999; // $9.99 below the threshold
export const FREE_SHIPPING_THRESHOLD_CENTS = 50_000; // $500

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function shippingForSubtotal(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}

export function discountPercent(priceCents: number, compareAtCents: number | null): number {
  if (compareAtCents === null || compareAtCents <= priceCents) return 0;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}
