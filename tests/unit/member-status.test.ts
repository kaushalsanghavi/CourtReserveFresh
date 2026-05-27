import { describe, expect, it } from "vitest";
import {
  coerceDbBoolean,
  isMemberActive,
  normalizeMemberStatusFilter,
} from "../../server/member-status";

describe("member status helpers", () => {
  it("normalizes supported status filters and rejects invalid ones", () => {
    expect(normalizeMemberStatusFilter(undefined)).toBe("all");
    expect(normalizeMemberStatusFilter("")).toBe("all");
    expect(normalizeMemberStatusFilter("active")).toBe("active");
    expect(normalizeMemberStatusFilter("inactive")).toBe("inactive");
    expect(normalizeMemberStatusFilter("all")).toBe("all");
    expect(normalizeMemberStatusFilter("paused")).toBeNull();
  });

  it("coerces db booleans consistently", () => {
    expect(coerceDbBoolean(true)).toBe(true);
    expect(coerceDbBoolean("true")).toBe(true);
    expect(coerceDbBoolean("t")).toBe(true);
    expect(coerceDbBoolean(1)).toBe(true);
    expect(coerceDbBoolean(false)).toBe(false);
    expect(coerceDbBoolean("false")).toBe(false);
    expect(coerceDbBoolean(0)).toBe(false);
  });

  it("treats missing members as inactive for booking purposes", () => {
    expect(isMemberActive({ isActive: true })).toBe(true);
    expect(isMemberActive({ isActive: false })).toBe(false);
    expect(isMemberActive(undefined)).toBe(false);
  });
});
