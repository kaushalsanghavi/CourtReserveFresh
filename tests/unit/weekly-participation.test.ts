import { describe, expect, it } from "vitest";
import {
  buildWeeklyParticipation,
  getWeekStart,
  getWeekStarts,
} from "../../shared/weekly-participation";

const members = [
  { id: "a", name: "Asha", isActive: true },
  { id: "b", name: "Bilal", isActive: true },
  { id: "c", name: "Chetan", isActive: false },
  { id: "d", name: "Divya", isActive: false },
];

describe("weekly participation", () => {
  it("treats Monday as the start of the week", () => {
    expect(getWeekStart("2026-03-02")).toBe("2026-03-02");
    expect(getWeekStart("2026-03-06")).toBe("2026-03-02");
    expect(getWeekStart("2026-03-08")).toBe("2026-03-02");
    expect(getWeekStart("2026-03-09")).toBe("2026-03-09");
  });

  it("lists past, current and upcoming week starts in order", () => {
    expect(getWeekStarts("2026-03-04", 2, 1)).toEqual([
      "2026-02-16",
      "2026-02-23",
      "2026-03-02",
      "2026-03-09",
    ]);
  });

  it("counts bookings per member per week and compares against the group average", () => {
    const weeks = ["2026-02-23", "2026-03-02"];
    const { rows, groupAverage } = buildWeeklyParticipation(
      members,
      [
        { memberId: "a", date: "2026-02-24" },
        { memberId: "a", date: "2026-02-25" },
        { memberId: "a", date: "2026-03-03" },
        { memberId: "b", date: "2026-03-04" },
        { memberId: "c", date: "2026-03-05" },
        { memberId: "a", date: "2026-01-05" },
      ],
      weeks,
    );

    expect(rows.map((row) => row.member.id)).toEqual(["a", "b", "c"]);
    expect(rows[0]).toMatchObject({ counts: [2, 1], total: 3, average: 1.5 });
    expect(rows[1]).toMatchObject({ counts: [0, 1], total: 1, average: 0.5 });
    expect(rows[2]).toMatchObject({ counts: [0, 1], total: 1, average: 0.5 });
    expect(groupAverage).toBe(0.8);
    expect(rows[0].difference).toBe(0.7);
    expect(rows[1].difference).toBe(-0.3);
  });

  it("hides inactive members with no bookings in the range", () => {
    const { rows } = buildWeeklyParticipation(members, [], ["2026-03-02"]);
    expect(rows.map((row) => row.member.id)).toEqual(["a", "b"]);
  });
});
