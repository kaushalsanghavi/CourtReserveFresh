import { describe, expect, it } from "vitest";
import {
  getFineAmount,
  getFineIncidentDate,
} from "../../shared/fine-policy";

describe("Party Fund policy", () => {
  it("uses the configured amounts", () => {
    expect(getFineAmount("late")).toBe(50);
    expect(getFineAmount("no-show")).toBe(100);
  });

  it("derives the incident date in India regardless of the input offset", () => {
    expect(getFineIncidentDate(new Date("2026-09-29T21:00:00-07:00"))).toBe("2026-09-30");
    expect(getFineIncidentDate(new Date("2026-09-30T23:59:59+05:30"))).toBe("2026-09-30");
  });
});
