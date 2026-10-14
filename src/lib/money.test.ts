// Unit pins for the money seam (integer cents everywhere).
import { describe, expect, it } from "vitest";
import {
  FLAT_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  discountPercent,
  formatCents,
  shippingForSubtotal,
} from "./money";

describe("formatCents", () => {
  it("formats whole dollars without decimals (reference price style)", () => {
    expect(formatCents(12900)).toBe("$129");
    expect(formatCents(50_000)).toBe("$500");
  });

  it("keeps two decimals only when cents are non-zero", () => {
    expect(formatCents(12999)).toBe("$129.99");
    expect(formatCents(1)).toBe("$0.01");
  });

  it("handles zero", () => {
    expect(formatCents(0)).toBe("$0");
  });
});

describe("shippingForSubtotal", () => {
  it("charges the flat rate below the threshold", () => {
    expect(shippingForSubtotal(FREE_SHIPPING_THRESHOLD_CENTS - 1)).toBe(FLAT_SHIPPING_CENTS);
  });

  it("is complimentary at exactly the announcement-bar threshold ($500)", () => {
    expect(shippingForSubtotal(FREE_SHIPPING_THRESHOLD_CENTS)).toBe(0);
  });

  it("stays free above the threshold", () => {
    expect(shippingForSubtotal(999_999)).toBe(0);
  });
});

describe("discountPercent", () => {
  it("computes the rounded markdown", () => {
    // 29900 vs 39900 → 25.06% → 25
    expect(discountPercent(29_900, 39_900)).toBe(25);
  });

  it("returns 0 without a compare-at price", () => {
    expect(discountPercent(29_900, null)).toBe(0);
  });

  it("never yields a negative discount for mispriced rows", () => {
    expect(discountPercent(39_900, 29_900)).toBe(0);
    expect(discountPercent(39_900, 39_900)).toBe(0);
  });
});
