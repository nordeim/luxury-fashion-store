// Zod validation schemas — the single validation dialect at every seam.
// SQLite has no enums: roles/statuses are Strings validated here.

import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// H-33 (session-6): the profile seam's governed schema — updateProfileAction
// was the sole mutation seam hand-rolling its field rules (the H-19 drift
// class). Same policy the form always enforced: 1–80 chars after trim.
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name").max(80, "Enter your full name"),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    // Optional display name — derived from the email local part when absent.
    name: z.string().trim().max(80).optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Re-enter your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * H-59 (session-9): the bag-size allowlist seam. `product.sizes` is a
 * JSON-string column; a crafted server-action call used to be able to persist
 * ANY ≤20-char string as a bag variant (cartAddSchema enforces only the shape).
 * P-11 made size a user-clicked input on every card, so the seam is validated
 * against the product's own list now. Unparseable/empty/non-array data is
 * treated as UNCONSTRAINED — corrupt catalog rows must never brick the bag.
 */
export function sizeAllowed(productSizesJson: string, requested: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(productSizesJson);
  } catch {
    return true;
  }
  if (!Array.isArray(parsed)) return true;
  const list = parsed.filter((s): s is string => typeof s === "string");
  if (list.length === 0) return true;
  return list.includes(requested);
}

export const cartAddSchema = z.object({
  productId: z.string().min(1),
  size: z.string().max(20).default(""),
  quantity: z.number().int().min(1).max(99),
});

export const cartDeltaSchema = z.object({
  delta: z.number().int().min(-99).max(99),
});

export const wishlistMutationSchema = z.object({
  productId: z.string().min(1),
});

export const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(40).default("Home"),
  fullName: z.string().trim().min(1, "Full name is required").max(80),
  street: z.string().trim().min(1, "Street is required").max(160),
  city: z.string().trim().min(1, "City is required").max(80),
  state: z.string().trim().min(1, "State is required").max(40),
  zip: z.string().trim().min(3, "Enter a valid ZIP").max(12),
  country: z.string().trim().min(1).max(80).default("United States"),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(1, "Full name is required").max(80),
  street: z.string().trim().min(1, "Street is required").max(160),
  city: z.string().trim().min(1, "City is required").max(80),
  state: z.string().trim().min(1, "State is required").max(40),
  zip: z.string().trim().min(3, "Enter a valid ZIP").max(12),
  country: z.string().trim().min(1).max(80).default("United States"),
  paymentMethod: z.enum(["card", "cod"]),
  // F-10 (session-3): caps keep the demo-card seam bounded — real validation
  // (digits/expiry/Luhn) happens later in the action, but the schema should
  // reject oversized payloads up front. Lengths include formatting spaces.
  cardNumber: z.string().max(32).optional(),
  cardExpiry: z.string().max(7).optional(),
  cardCvc: z.string().max(4).optional(),
});

export const orderStatusSchema = z.enum(["processing", "in_transit", "delivered", "cancelled"]);

export const adminOrderUpdateSchema = z.object({
  orderId: z.string().min(1),
  status: orderStatusSchema.optional(),
  carrier: z.string().trim().max(40).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
});

export const adminProductUpdateSchema = z.object({
  productId: z.string().min(1),
  stock: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});

/** Conservative same-origin redirect paths only (open-redirect defense). */
export function validateRedirectPath(raw: unknown, fallback = "/account"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(raw)) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

/** Luhn check for the demo card field (validated client-side, verified here). */
export function isLuhnValid(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}
