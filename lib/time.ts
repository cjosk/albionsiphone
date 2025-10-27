import { formatInTimeZone } from "date-fns-tz";

export const ISTANBUL_TZ = "Europe/Istanbul";
const ISTANBUL_STATIC_OFFSET = "+03:00";

function normalizeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withT = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const parts = withT.split("T");
  const datePart = parts[0];
  const timePart = parts[1] ?? "";

  let normalizedTime = timePart;
  if (!normalizedTime) {
    normalizedTime = "00:00";
  }

  if (/^\d{2}:\d{2}$/.test(normalizedTime)) {
    normalizedTime = `${normalizedTime}:00`;
  }

  if (!/^\d{2}:\d{2}:\d{2}$/.test(normalizedTime)) {
    return "";
  }

  let isoCandidate = `${datePart}T${normalizedTime}`;
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(isoCandidate)) {
    isoCandidate = `${isoCandidate}${ISTANBUL_STATIC_OFFSET}`;
  }

  return isoCandidate;
}

export function formatDateTime(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  return formatInTimeZone(date, ISTANBUL_TZ, "dd MMM yyyy • HH:mm");
}

export function formatDateOnly(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  return formatInTimeZone(date, ISTANBUL_TZ, "dd MMM yyyy");
}

export function formatIstanbulTime(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  return formatInTimeZone(date, ISTANBUL_TZ, "yyyy-MM-dd HH:mm:ss");
}

export function toDateInputValue(date: Date = new Date()) {
  return formatInTimeZone(date, ISTANBUL_TZ, "yyyy-MM-dd'T'HH:mm");
}

export function parseDateInput(value: string) {
  const isoCandidate = normalizeInput(value);
  if (!isoCandidate) {
    return new Date(NaN);
  }
  return new Date(isoCandidate);
}
