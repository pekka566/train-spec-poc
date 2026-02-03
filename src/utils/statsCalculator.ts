import type { TrainRecord, TrainSummary } from "@/types/train";

/**
 * Compute summary statistics for a set of train records
 * Percentages use totalCount as denominator (all records including cancelled)
 * Average delay excludes cancelled trains
 */
export function computeSummary(records: TrainRecord[]): TrainSummary {
  const totalCount = records.length;

  if (totalCount === 0) {
    return {
      onTimePercent: 0,
      slightDelayPercent: 0,
      delayedPercent: 0,
      cancelledCount: 0,
      averageDelay: 0,
      totalCount: 0,
      onTimeCount: 0,
      slightDelayCount: 0,
      delayedCount: 0,
    };
  }

  let onTimeCount = 0;
  let slightDelayCount = 0;
  let delayedCount = 0;
  let cancelledCount = 0;
  let totalDelay = 0;
  let nonCancelledCount = 0;

  for (const record of records) {
    switch (record.status) {
      case "ON_TIME":
        onTimeCount++;
        nonCancelledCount++;
        totalDelay += record.delayMinutes;
        break;
      case "SLIGHT_DELAY":
        slightDelayCount++;
        nonCancelledCount++;
        totalDelay += record.delayMinutes;
        break;
      case "DELAYED":
        delayedCount++;
        nonCancelledCount++;
        totalDelay += record.delayMinutes;
        break;
      case "CANCELLED":
        cancelledCount++;
        break;
    }
  }

  const averageDelay = nonCancelledCount > 0 ? totalDelay / nonCancelledCount : 0;

  return {
    onTimePercent: (onTimeCount / totalCount) * 100,
    slightDelayPercent: (slightDelayCount / totalCount) * 100,
    delayedPercent: (delayedCount / totalCount) * 100,
    cancelledCount,
    averageDelay: Math.round(averageDelay * 10) / 10, // Round to 1 decimal
    totalCount,
    onTimeCount,
    slightDelayCount,
    delayedCount,
  };
}

/**
 * Filter records for a specific train number
 */
export function filterByTrain(
  records: TrainRecord[],
  trainNumber: number
): TrainRecord[] {
  return records.filter((r) => r.trainNumber === trainNumber);
}

/**
 * Sort records by date (newest first by default)
 */
export function sortByDate(
  records: TrainRecord[],
  ascending: boolean = false
): TrainRecord[] {
  return [...records].sort((a, b) => {
    const comparison = a.date.localeCompare(b.date);
    return ascending ? comparison : -comparison;
  });
}
