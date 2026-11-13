import { describe, expect, it } from "vitest";
import {
  getWeekStart,
  getWeekdays,
  getWeeklyPlayerCounts,
  shiftWeek,
} from "../../shared/weekly-participation";

const members = [
  { id: "a", name: "Asha", isActive: true },
  { id: "b", name: "Bilal", isActive: true },
  { id: "c", name: "Chetan", isActive: false },
  { id: "d", name: "Divya", isActive: false },
  { id: "e", name: "Esha", isActive: true },
];

describe("weekly player counts", () => {
  it("treats Monday as the start of the week", () => {
    expect(getWeekStart("2026-03-02")).toBe("2026-03-02");
    expect(getWeekStart("2026-03-06")).toBe("2026-03-02");
    expect(getWeekStart("2026-03-08")).toBe("2026-03-02");
    expect(getWeekStart("2026-03-09")).toBe("2026-03-09");
  });

  it("moves between weeks and lists the weekdays", () => {
    expect(shiftWeek("2026-03-02", -1)).toBe("2026-02-23");
    expect(shiftWeek("2026-03-02", 1)).toBe("2026-03-09");
    expect(getWeekdays("2026-03-02")).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
    ]);
  });

  it("counts the days each player is playing that week, most first", () => {
    const rows = getWeeklyPlayerCounts(
      members,
      [
        { memberId: "b", date: "2026-03-02" },
        { memberId: "b", date: "2026-03-04" },
        { memberId: "b", date: "2026-03-04" },
        { memberId: "a", date: "2026-03-06" },
        { memberId: "c", date: "2026-03-03" },
        { memberId: "a", date: "2026-02-27" },
        { memberId: "a", date: "2026-03-09" },
      ],
      "2026-03-02",
    );

    expect(rows.map((row) => [row.member.id, row.count])).toEqual([
      ["b", 2],
      ["a", 1],
      ["c", 1],
      ["e", 0],
    ]);
    expect(rows[0].bookedDates).toEqual(["2026-03-02", "2026-03-04"]);
  });
});
