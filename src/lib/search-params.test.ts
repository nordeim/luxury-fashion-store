// H-1 (session-5): repeated query keys arrive as string[] at runtime while
// Next types searchParams values as string. The G-8 coercion (session-4) was
// applied only to the checkout token; every other consumer still feeds raw
// values into Prisma. firstParam() is the shared, unit-pinned coercion.
import { describe, expect, it } from "vitest";
import { firstParam } from "@/lib/search-params";

describe("firstParam", () => {
  it("passes a plain string through", () => {
    expect(firstParam("processing")).toBe("processing");
  });

  it("takes the first element of a repeated key (string[])", () => {
    expect(firstParam(["processing", "delivered"])).toBe("processing");
  });

  it("takes the first element even when it is empty", () => {
    expect(firstParam(["", "x"])).toBe("");
  });

  it("maps undefined to undefined", () => {
    expect(firstParam(undefined)).toBeUndefined();
  });

  it("maps null to undefined (absent FormData-style key)", () => {
    expect(firstParam(null)).toBeUndefined();
  });
});
