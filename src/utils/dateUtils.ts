import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const FINNISH_TIMEZONE = "Europe/Helsinki";

const FINNISH_WEEKDAYS: Record<number, string> = {
  1: "ma",
  2: "ti",
  3: "ke",
  4: "to",
  5: "pe",
  6: "la",
  0: "su",
};

/**
 * Get today's date in Finnish timezone as YYYY-MM-DD
 */
export function getTodayFinnish(): string {
  return dayjs().tz(FINNISH_TIMEZONE).format("YYYY-MM-DD");
}

/**
 * Check if a date string (YYYY-MM-DD) is today in Finnish timezone
 */
export function isToday(date: string): boolean {
  return date === getTodayFinnish();
}

/**
 * Format ISO date (YYYY-MM-DD) to Finnish weekday abbreviation + day.month
 * e.g. "2026-01-27" -> "ma 27.1."
 */
export function formatFinnishDate(date: string): string {
  const d = dayjs(date).tz(FINNISH_TIMEZONE);
  const weekday = FINNISH_WEEKDAYS[d.day()];
  return `${weekday} ${d.date()}.${d.month() + 1}.`;
}

/**
 * Format ISO timestamp to 24h time in Finnish timezone
 * e.g. "2026-01-27T06:20:00Z" -> "08:20"
 */
export function formatFinnishTime(isoTimestamp: string): string {
  return dayjs(isoTimestamp).tz(FINNISH_TIMEZONE).format("HH:mm");
}

/**
 * Get all weekdays (Mon-Fri) in a date range, excluding future dates
 * Returns dates as YYYY-MM-DD strings, sorted oldest to newest
 */
export function getWeekdaysInRange(startDate: string, endDate: string): string[] {
  const weekdays: string[] = [];
  const today = getTodayFinnish();
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  let current = start;
  while (current.isBefore(end) || current.isSame(end, "day")) {
    const dateStr = current.format("YYYY-MM-DD");
    const dayOfWeek = current.day();

    // Only include weekdays (Mon=1 to Fri=5) and not future dates
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && dateStr <= today) {
      weekdays.push(dateStr);
    }

    current = current.add(1, "day");
  }

  return weekdays;
}

/**
 * Get the default date range (last 14 calendar days)
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = dayjs().tz(FINNISH_TIMEZONE);
  const endDate = today.format("YYYY-MM-DD");
  const startDate = today.subtract(13, "day").format("YYYY-MM-DD"); // 14 days including today

  return { startDate, endDate };
}

/**
 * Check if end date is in the future
 */
export function isEndDateInFuture(endDate: string): boolean {
  return endDate > getTodayFinnish();
}
