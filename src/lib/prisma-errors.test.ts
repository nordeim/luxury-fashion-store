// Unit pins for the shared Prisma error detectors (G-7 session-4;
// isRecordNotFound added H-23 session-6, pinned symmetrically H-44 session-7 —
// the E2E double-remove tests cannot reach the P2025 branch, so this file is
// the only direct evidence the catch path discriminates correctly).
import { describe, expect, it } from "vitest";
import { isRecordNotFound, isUniqueViolation } from "./prisma-errors";

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

describe("isRecordNotFound (H-44)", () => {
  it("recognizes P2025", () => {
    expect(isRecordNotFound({ code: "P2025" })).toBe(true);
  });

  it("rejects other Prisma codes and non-objects", () => {
    expect(isRecordNotFound({ code: "P2002" })).toBe(false);
    expect(isRecordNotFound(new Error("not found"))).toBe(false);
    expect(isRecordNotFound(null)).toBe(false);
    expect(isRecordNotFound("P2025")).toBe(false);
    expect(isRecordNotFound(undefined)).toBe(false);
  });
});
