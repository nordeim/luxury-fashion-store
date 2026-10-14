// Unit pins for the shared Prisma unique-violation detector (G-7, session-4).
import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./prisma-errors";

describe("isUniqueViolation", () => {
  it("recognizes P2002", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });

  it("rejects other Prisma codes and non-objects", () => {
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(new Error("unique"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
