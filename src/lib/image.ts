/**
 * Hardened catalog-image extraction (G-7, session-4).
 *
 * Catalog rows store `images` as a JSON string; a corrupted row must never
 * kill a render path or leak a non-string into <img src>. Single source of
 * truth — previously three copies existed and had drifted (cart.ts returned
 * arr[0] even when it was not a string).
 */
export function firstImage(raw: string | null | undefined): string {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) {
      const first = parsed.find((x): x is string => typeof x === "string");
      return first ?? "";
    }
  } catch {
    // fall through to the empty-string contract
  }
  return "";
}
