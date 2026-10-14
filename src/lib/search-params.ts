// H-1 (session-5): Next.js types dynamic searchParams values as `string`, but
// repeated keys (?status=a&status=b) arrive as `string[]` at runtime. The
// session-4 G-8 fix coerced the checkout token only; every other consumer
// would still feed a raw array into Prisma (unhandled 500 on malformed URLs).
// Every searchParams consumer funnels its values through this helper.
export type SearchParamValue = string | string[] | undefined | null;

/** Coerce a Next.js searchParams value to its first string (or undefined). */
export function firstParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;
  return undefined;
}
