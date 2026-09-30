import { describe, expect, it } from "vitest";
import {
  getFineAmount,
  getFineReportingWindow,
} from "../../shared/fine-policy";

describe("Party Fund policy", () => {
  it("uses the configured amounts", () => {
    expect(getFineAmount("late")).toBe(50);
    expect(getFineAmount("no-show")).toBe(100);
  });

  it("opens at exactly 8:20 AM IST", () => {
    expect(getFineReportingWindow(new Date("2026-09-30T08:19:59+05:30")).isOpen).toBe(false);
    expect(getFineReportingWindow(new Date("2026-09-30T08:20:00+05:30")).isOpen).toBe(true);
  });

  it("closes immediately after exactly 10:00 AM IST", () => {
    expect(getFineReportingWindow(new Date("2026-09-30T10:00:00+05:30")).isOpen).toBe(true);
    expect(getFineReportingWindow(new Date("2026-09-30T10:00:01+05:30")).isOpen).toBe(false);
  });

  it("derives the incident date in India regardless of the input offset", () => {
    expect(getFineReportingWindow(new Date("2026-09-29T21:00:00-07:00")).date).toBe("2026-09-30");
  });
});
