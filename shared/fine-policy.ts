export const FINE_TIME_ZONE = "Asia/Kolkata";
export const LATE_FINE_AMOUNT = 50;
export const NO_SHOW_FINE_AMOUNT = 100;

export function getFineIncidentDate(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: FINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getFineAmount(reason: "late" | "no-show"): number {
  return reason === "late" ? LATE_FINE_AMOUNT : NO_SHOW_FINE_AMOUNT;
}
