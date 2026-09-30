export const FINE_TIME_ZONE = "Asia/Kolkata";
export const LATE_FINE_AMOUNT = 50;
export const NO_SHOW_FINE_AMOUNT = 100;
export const FINE_REPORTING_WINDOW_MESSAGE =
  "Fines can only be reported from 8:20 AM through 10:00 AM IST on the incident date.";

const START_SECONDS = 8 * 60 * 60 + 20 * 60;
const END_SECONDS = 10 * 60 * 60;

export interface FineReportingWindow {
  date: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
}

export function getIstDateTimeParts(now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: FINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute")),
    second: Number(part("second")),
  };
}

export function getFineReportingWindow(now: Date = new Date()): FineReportingWindow {
  const parts = getIstDateTimeParts(now);
  const currentSeconds = parts.hour * 60 * 60 + parts.minute * 60 + parts.second;
  return {
    date: parts.date,
    isOpen: currentSeconds >= START_SECONDS && currentSeconds <= END_SECONDS,
    opensAt: "08:20",
    closesAt: "10:00",
  };
}

export function getFineAmount(reason: "late" | "no-show"): number {
  return reason === "late" ? LATE_FINE_AMOUNT : NO_SHOW_FINE_AMOUNT;
}
