// Unit pins for the Zod validation seam.
import { describe, expect, it } from "vitest";
import {
  addressSchema,
  adminOrderUpdateSchema,
  cartAddSchema,
  cartDeltaSchema,
  checkoutSchema,
  isLuhnValid,
  loginSchema,
  orderStatusSchema,
  registerSchema,
  sizeAllowed,
  validateRedirectPath,
  wishlistMutationSchema,
} from "./validation";

describe("loginSchema", () => {
  it("accepts the seeded demo credentials shape", () => {
    const parsed = loginSchema.safeParse({ email: "james@example.com", password: "Password123" });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "Password123" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = { name: "James Whitmore", email: "j@example.com", password: "Password123", confirmPassword: "Password123" };

  it("accepts matching passwords", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched confirm", () => {
    expect(registerSchema.safeParse({ ...base, confirmPassword: "Other123" }).success).toBe(false);
  });

  it("enforces the password floor", () => {
    expect(registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(false);
  });
});

describe("cartAddSchema", () => {
  it("accepts a normal add and defaults size to empty", () => {
    const parsed = cartAddSchema.parse({ productId: "p1", quantity: 1 });
    expect(parsed).toEqual({ productId: "p1", size: "", quantity: 1 });
  });

  it("rejects zero and negative quantities", () => {
    expect(cartAddSchema.safeParse({ productId: "p1", quantity: 0 }).success).toBe(false);
    expect(cartAddSchema.safeParse({ productId: "p1", quantity: -2 }).success).toBe(false);
  });

  it("caps runaway quantities at the schema ceiling", () => {
    expect(cartAddSchema.safeParse({ productId: "p1", quantity: 100 }).success).toBe(false);
  });
});

describe("cartDeltaSchema", () => {
  it("accepts stepper deltas and rejects oversized jumps", () => {
    expect(cartDeltaSchema.safeParse({ delta: -1 }).success).toBe(true);
    expect(cartDeltaSchema.safeParse({ delta: 99 }).success).toBe(true);
    expect(cartDeltaSchema.safeParse({ delta: 100 }).success).toBe(false);
    expect(cartDeltaSchema.safeParse({ delta: 1.5 }).success).toBe(false);
  });
});

describe("wishlistMutationSchema (H-53 — the toggle seam validates before Prisma)", () => {
  it("accepts a non-empty product id", () => {
    expect(wishlistMutationSchema.safeParse({ productId: "prod_1" }).success).toBe(true);
  });

  it("rejects an empty id (the schema is wired into toggleWishlistAction — H-53)", () => {
    expect(wishlistMutationSchema.safeParse({ productId: "" }).success).toBe(false);
  });

  it("rejects non-string ids before any DB call", () => {
    expect(wishlistMutationSchema.safeParse({ productId: 123 }).success).toBe(false);
    expect(wishlistMutationSchema.safeParse({}).success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const base = {
    email: "guest@example.com",
    fullName: "Guest Buyer",
    street: "1 Fifth Ave",
    city: "New York",
    state: "NY",
    zip: "10012",
    paymentMethod: "cod" as const,
  };

  it("accepts a complete COD order", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });

  it("defaults country to United States", () => {
    const parsed = checkoutSchema.parse(base);
    expect(parsed.country).toBe("United States");
  });

  it("caps card-field payload lengths (F-10: no unbounded seams)", () => {
    expect(
      checkoutSchema.safeParse({ ...base, paymentMethod: "card", cardNumber: "4".repeat(33) }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...base, paymentMethod: "card", cardExpiry: "1".repeat(8) }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...base, paymentMethod: "card", cardCvc: "1".repeat(5) }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...base, paymentMethod: "card", cardNumber: "4242 4242 4242 4242" }).success,
    ).toBe(true);
  });

  it("rejects a bad payment method enum", () => {
    expect(checkoutSchema.safeParse({ ...base, paymentMethod: "crypto" }).success).toBe(false);
  });

  it("rejects a short ZIP", () => {
    expect(checkoutSchema.safeParse({ ...base, zip: "1" }).success).toBe(false);
  });
});

describe("addressSchema", () => {
  it("requires the core fields", () => {
    expect(addressSchema.safeParse({ fullName: "", street: "x", city: "y", state: "z", zip: "10012" }).success).toBe(false);
    expect(
      addressSchema.safeParse({ fullName: "A", street: "S", city: "C", state: "ST", zip: "10012" }).success,
    ).toBe(true);
  });
});

describe("admin schemas", () => {
  it("restricts order status to the lifecycle enum", () => {
    expect(orderStatusSchema.safeParse("in_transit").success).toBe(true);
    expect(orderStatusSchema.safeParse("refunded").success).toBe(false);
    expect(adminOrderUpdateSchema.safeParse({ orderId: "o1", status: "delivered" }).success).toBe(true);
  });
});

describe("validateRedirectPath (open-redirect defense)", () => {
  it("allows same-origin paths", () => {
    expect(validateRedirectPath("/account")).toBe("/account");
    expect(validateRedirectPath("/shop?search=dress")).toBe("/shop?search=dress");
  });

  it("falls back on protocol-relative and absolute URLs", () => {
    expect(validateRedirectPath("//evil.example")).toBe("/account");
    expect(validateRedirectPath("https://evil.example")).toBe("/account");
  });

  it("falls back on control characters and junk", () => {
    expect(validateRedirectPath("/a\r\nSet-Cookie: x")).toBe("/account");
    expect(validateRedirectPath(42)).toBe("/account");
    expect(validateRedirectPath(undefined)).toBe("/account");
    expect(validateRedirectPath("", "/wishlist")).toBe("/wishlist");
  });
});

describe("isLuhnValid (demo card verification)", () => {
  it("accepts the classic Stripe test card with spaces", () => {
    expect(isLuhnValid("4242 4242 4242 4242")).toBe(true);
  });

  it("rejects a bad digit, short input, and non-numeric junk", () => {
    expect(isLuhnValid("4242 4242 4242 4241")).toBe(false);
    expect(isLuhnValid("42424242")).toBe(false);
    expect(isLuhnValid("abcd efgh")).toBe(false);
  });
});

describe("sizeAllowed (H-59 — the bag-size allowlist seam)", () => {
  it("accepts a size the product actually offers", () => {
    expect(sizeAllowed('["XS","S","M","L"]', "M")).toBe(true);
    expect(sizeAllowed('["One Size"]', "One Size")).toBe(true);
  });

  it("rejects a foreign size (crafted server-action variant)", () => {
    expect(sizeAllowed('["XS","S","M","L"]', "XXL")).toBe(false);
    expect(sizeAllowed('["XS","S","M","L"]', "")).toBe(false);
  });

  it("is unconstrained when the catalog carries no usable size list", () => {
    expect(sizeAllowed("[]", "M")).toBe(true); // empty list — nothing to check against
    expect(sizeAllowed("not-json", "M")).toBe(true); // malformed legacy data — never brick the bag
    expect(sizeAllowed('{"a":1}', "M")).toBe(true); // non-array junk — unconstrained
  });

  it("ignores non-string entries instead of rejecting the whole list", () => {
    expect(sizeAllowed('["XS", 5, null]', "XS")).toBe(true);
    expect(sizeAllowed('["XS", 5, null]', "M")).toBe(false);
  });
});
