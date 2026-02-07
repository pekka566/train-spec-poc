import { describe, it, expect } from "vitest";
import { computeSummary, filterByTrain, sortByDate } from "./statsCalculator";
import type { TrainRecord } from "@/types/train";

const createRecord = (
  overrides: Partial<TrainRecord> = {}
): TrainRecord => ({
  date: "2026-01-27",
  trainNumber: 1719,
  trainType: "HL",
  cancelled: false,
  scheduledDeparture: "2026-01-27T06:20:00Z",
  actualDeparture: "2026-01-27T06:20:00Z",
  scheduledArrival: "2026-01-27T06:35:00Z",
  actualArrival: "2026-01-27T06:35:00Z",
  delayMinutes: 0,
  status: "ON_TIME",
  ...overrides,
});

describe("statsCalculator", () => {
  describe("computeSummary", () => {
    it("returns zeros for empty array", () => {
      const summary = computeSummary([]);
      expect(summary.totalCount).toBe(0);
      expect(summary.onTimePercent).toBe(0);
      expect(summary.averageDelay).toBe(0);
    });

    it("calculates correct percentages", () => {
      const records: TrainRecord[] = [
        createRecord({ status: "ON_TIME", delayMinutes: 0 }),
        createRecord({ status: "ON_TIME", delayMinutes: 0, date: "2026-01-28" }),
        createRecord({ status: "SLIGHT_DELAY", delayMinutes: 3, date: "2026-01-29" }),
        createRecord({ status: "DELAYED", delayMinutes: 8, date: "2026-01-30" }),
      ];

      const summary = computeSummary(records);
      expect(summary.totalCount).toBe(4);
      expect(summary.onTimeCount).toBe(2);
      expect(summary.slightDelayCount).toBe(1);
      expect(summary.delayedCount).toBe(1);
      expect(summary.onTimePercent).toBe(50);
      expect(summary.slightDelayPercent).toBe(25);
      expect(summary.delayedPercent).toBe(25);
    });

    it("excludes cancelled trains from average delay", () => {
      const records: TrainRecord[] = [
        createRecord({ status: "ON_TIME", delayMinutes: 0 }),
        createRecord({ status: "CANCELLED", cancelled: true, delayMinutes: 0, date: "2026-01-28" }),
        createRecord({ status: "SLIGHT_DELAY", delayMinutes: 4, date: "2026-01-29" }),
      ];

      const summary = computeSummary(records);
      expect(summary.cancelledCount).toBe(1);
      // Average delay: (0 + 4) / 2 = 2
      expect(summary.averageDelay).toBe(2);
    });

    it("includes cancelled in total count for percentages", () => {
      const records: TrainRecord[] = [
        createRecord({ status: "ON_TIME", delayMinutes: 0 }),
        createRecord({ status: "CANCELLED", cancelled: true, date: "2026-01-28" }),
      ];

      const summary = computeSummary(records);
      expect(summary.totalCount).toBe(2);
      expect(summary.onTimePercent).toBe(50); // 1/2 = 50%
    });

    it("returns averageDelay 0 when all records are cancelled", () => {
      const records: TrainRecord[] = [
        createRecord({ status: "CANCELLED", cancelled: true }),
        createRecord({ status: "CANCELLED", cancelled: true, date: "2026-01-28" }),
      ];

      const summary = computeSummary(records);
      expect(summary.totalCount).toBe(2);
      expect(summary.cancelledCount).toBe(2);
      expect(summary.averageDelay).toBe(0);
    });
  });

  describe("filterByTrain", () => {
    it("filters records by train number", () => {
      const records: TrainRecord[] = [
        createRecord({ trainNumber: 1719 }),
        createRecord({ trainNumber: 9700, date: "2026-01-28" }),
        createRecord({ trainNumber: 1719, date: "2026-01-29" }),
      ];

      const morning = filterByTrain(records, 1719);
      expect(morning).toHaveLength(2);
      expect(morning.every((r) => r.trainNumber === 1719)).toBe(true);

      const evening = filterByTrain(records, 9700);
      expect(evening).toHaveLength(1);
    });
  });

  describe("sortByDate", () => {
    it("sorts by date descending by default", () => {
      const records: TrainRecord[] = [
        createRecord({ date: "2026-01-27" }),
        createRecord({ date: "2026-01-29" }),
        createRecord({ date: "2026-01-28" }),
      ];

      const sorted = sortByDate(records);
      expect(sorted.map((r) => r.date)).toEqual([
        "2026-01-29",
        "2026-01-28",
        "2026-01-27",
      ]);
    });

    it("sorts by date ascending when specified", () => {
      const records: TrainRecord[] = [
        createRecord({ date: "2026-01-29" }),
        createRecord({ date: "2026-01-27" }),
        createRecord({ date: "2026-01-28" }),
      ];

      const sorted = sortByDate(records, true);
      expect(sorted.map((r) => r.date)).toEqual([
        "2026-01-27",
        "2026-01-28",
        "2026-01-29",
      ]);
    });

    it("does not mutate original array", () => {
      const records: TrainRecord[] = [
        createRecord({ date: "2026-01-27" }),
        createRecord({ date: "2026-01-29" }),
      ];
      const original = [...records];

      sortByDate(records);
      expect(records).toEqual(original);
    });
  });
});
