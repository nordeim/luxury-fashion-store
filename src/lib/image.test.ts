// Unit pins for the shared hardened image parser (G-7, session-4).
// Extracted from three drifting copies (cart.ts returned arr[0] even when it
// was not a string — a corrupted catalog row would leak that into <img src>).
import { describe, expect, it } from "vitest";
import { firstImage } from "./image";

describe("firstImage", () => {
  it("extracts the first string of a valid JSON array", () => {
    expect(firstImage('["a.webp","b.webp"]')).toBe("a.webp");
  });

  it("skips non-string entries instead of returning them", () => {
    expect(firstImage('[{"url":"x"},"a.webp"]')).toBe("a.webp");
    expect(firstImage("[null,42,\"a.webp\"]")).toBe("a.webp");
  });

  it("tolerates corrupt JSON", () => {
    expect(firstImage("{not json")).toBe("");
  });

  it("tolerates non-array JSON", () => {
    expect(firstImage('{"a":1}')).toBe("");
    expect(firstImage('"just a string"')).toBe("");
  });

  it("handles empty arrays and empty/nullish input", () => {
    expect(firstImage("[]")).toBe("");
    expect(firstImage("")).toBe("");
    expect(firstImage(undefined as unknown as string)).toBe("");
  });
});
