import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";

export const ISTANBUL_TZ = "Europe/Istanbul";

export function formatDateTime(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  return formatInTimeZone(date, ISTANBUL_TZ, "dd MMM yyyy • HH:mm");
}

export function formatDateOnly(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  return formatInTimeZone(date, ISTANBUL_TZ, "dd MMM yyyy");
}

export function toDateInputValue(date: Date = new Date()) {
  return formatInTimeZone(date, ISTANBUL_TZ, "yyyy-MM-dd'T'HH:mm");
}

export function parseDateInput(value: string) {
  return zonedTimeToUtc(value, ISTANBUL_TZ);
}
