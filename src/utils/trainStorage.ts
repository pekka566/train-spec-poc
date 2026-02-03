import type { TrainRecord } from "@/types/train";
import { TRAIN_NUMBERS } from "@/types/train";
import { getWeekdaysInRange, isToday } from "./dateUtils";

const STORAGE_PREFIX = "train";

/**
 * Generate storage key for a train record
 */
function getStorageKey(date: string, trainNumber: number): string {
  return `${STORAGE_PREFIX}:${date}:${trainNumber}`;
}

/**
 * Get train data from local storage
 * Returns null if not found or if date is today (never read today's data from storage)
 */
export function getTrainFromStorage(
  date: string,
  trainNumber: number
): TrainRecord | null {
  // Never read today's data from storage
  if (isToday(date)) {
    return null;
  }

  const key = getStorageKey(date, trainNumber);
  const stored = localStorage.getItem(key);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as TrainRecord;
  } catch {
    return null;
  }
}

/**
 * Save train data to local storage
 * Does nothing if date is today (never store today's data)
 */
export function setTrainInStorage(
  date: string,
  trainNumber: number,
  record: TrainRecord
): void {
  // Never store today's data
  if (isToday(date)) {
    return;
  }

  const key = getStorageKey(date, trainNumber);
  localStorage.setItem(key, JSON.stringify(record));
}

/**
 * Calculate the number of API calls needed for a date range
 * Returns count of (date, trainNumber) pairs that would require an API call:
 * - Today always needs an API call (for each train)
 * - Past dates need an API call if not in local storage
 */
export function getNeededApiCalls(startDate: string, endDate: string): number {
  const weekdays = getWeekdaysInRange(startDate, endDate);
  let count = 0;

  for (const date of weekdays) {
    for (const trainNumber of TRAIN_NUMBERS) {
      if (isToday(date)) {
        // Today always needs an API call
        count++;
      } else {
        // Past dates need an API call if not in storage
        const stored = getTrainFromStorage(date, trainNumber);
        if (!stored) {
          count++;
        }
      }
    }
  }

  return count;
}

/**
 * Get pairs of (date, trainNumber) that need API calls
 */
export function getApiCallsNeeded(
  startDate: string,
  endDate: string
): Array<{ date: string; trainNumber: number }> {
  const weekdays = getWeekdaysInRange(startDate, endDate);
  const needed: Array<{ date: string; trainNumber: number }> = [];

  for (const date of weekdays) {
    for (const trainNumber of TRAIN_NUMBERS) {
      if (isToday(date) || !getTrainFromStorage(date, trainNumber)) {
        needed.push({ date, trainNumber });
      }
    }
  }

  return needed;
}

/**
 * Get all cached data for a date range
 * Returns records from local storage (excludes today's data which is not cached)
 */
export function getCachedData(
  startDate: string,
  endDate: string
): TrainRecord[] {
  const weekdays = getWeekdaysInRange(startDate, endDate);
  const records: TrainRecord[] = [];

  for (const date of weekdays) {
    for (const trainNumber of TRAIN_NUMBERS) {
      const record = getTrainFromStorage(date, trainNumber);
      if (record) {
        records.push(record);
      }
    }
  }

  return records;
}
