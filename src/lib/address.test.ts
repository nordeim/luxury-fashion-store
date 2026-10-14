// Unit pins for parseShippingAddress (F-8, session-3) — a corrupted
// shippingAddress column must never 500 a render path.
import { describe, expect, it } from "vitest";
import { parseShippingAddress } from "./address";

const GOOD = JSON.stringify({
  fullName: "Grace Kelly",
  street: "1 Fifth Ave",
  city: "New York",
  state: "NY",
  zip: "10012",
  country: "United States",
});

describe("parseShippingAddress", () => {
  it("parses a well-formed address row", () => {
    const a = parseShippingAddress(GOOD);
    expect(a.fullName).toBe("Grace Kelly");
    expect(a.city).toBe("New York");
    expect(a.country).toBe("United States");
  });

  it("falls back on corrupt JSON instead of throwing", () => {
    const a = parseShippingAddress("{not json");
    expect(a.fullName).toBe("—");
    expect(a.street).toBe("—");
  });

  it("falls back on a non-object payload", () => {
    expect(parseShippingAddress('["array"]').fullName).toBe("—");
    expect(parseShippingAddress("null").fullName).toBe("—");
    expect(parseShippingAddress(null).fullName).toBe("—");
  });

  it("coerces wrong-typed fields to the em-dash placeholder", () => {
    const a = parseShippingAddress(JSON.stringify({ fullName: 42, city: null }));
    expect(a.fullName).toBe("—");
    expect(a.city).toBe("—");
  });

  it("preserves valid fields while patching bad ones", () => {
    const a = parseShippingAddress(JSON.stringify({ fullName: "OK Name", zip: 10012 }));
    expect(a.fullName).toBe("OK Name");
    expect(a.zip).toBe("—");
  });
});
