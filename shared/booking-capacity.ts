export const FIVE_SLOT_CAPACITY_START_DATE = "2026-03-03";
export const DEFAULT_MAX_CAPACITY = 6;
export const REDUCED_MAX_CAPACITY = 5;

export function getMaxCapacityForDate(date: string): number {
  return date >= FIVE_SLOT_CAPACITY_START_DATE
    ? REDUCED_MAX_CAPACITY
    : DEFAULT_MAX_CAPACITY;
}
