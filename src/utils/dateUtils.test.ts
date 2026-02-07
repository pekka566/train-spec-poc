import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatFinnishDate,
  formatFinnishTime,
  getWeekdaysInRange,
  isToday,
  getTodayFinnish,
  getReferenceWeekdayDate,
  getDefaultDateRange,
  isEndDateInFuture,
} from "./dateUtils";

describe("dateUtils", () => {
  describe("formatFinnishDate", () => {
    it("formats Monday correctly", () => {
      expect(formatFinnishDate("2026-01-27")).toBe("ti 27.1.");
    });

    it("formats Friday correctly", () => {
      expect(formatFinnishDate("2026-01-31")).toBe("la 31.1.");
    });
  });

  describe("formatFinnishTime", () => {
    it("formats UTC time to Finnish timezone", () => {
      // In winter (UTC+2), 06:20 UTC = 08:20 Finnish
      expect(formatFinnishTime("2026-01-27T06:20:00Z")).toBe("08:20");
    });

    it("formats afternoon time correctly", () => {
      // In winter (UTC+2), 14:35 UTC = 16:35 Finnish
      expect(formatFinnishTime("2026-01-27T14:35:00Z")).toBe("16:35");
    });
  });

  describe("getWeekdaysInRange", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Set current date to 2026-02-03 (Tuesday)
      vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns only weekdays", () => {
      const weekdays = getWeekdaysInRange("2026-01-26", "2026-02-01");
      // 26 Mon, 27 Tue, 28 Wed, 29 Thu, 30 Fri, 31 Sat (excluded), 1 Sun (excluded)
      expect(weekdays).toEqual([
        "2026-01-26",
        "2026-01-27",
        "2026-01-28",
        "2026-01-29",
        "2026-01-30",
      ]);
    });

    it("excludes future dates", () => {
      const weekdays = getWeekdaysInRange("2026-02-02", "2026-02-06");
      // Today is 2026-02-03, so 04, 05, 06 should be excluded
      expect(weekdays).toEqual(["2026-02-02", "2026-02-03"]);
    });

    it("returns empty array for weekend-only range", () => {
      const weekdays = getWeekdaysInRange("2026-01-31", "2026-02-01");
      expect(weekdays).toEqual([]);
    });
  });

  describe("isToday", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns true for today", () => {
      expect(isToday("2026-02-03")).toBe(true);
    });

    it("returns false for yesterday", () => {
      expect(isToday("2026-02-02")).toBe(false);
    });
  });

  describe("getTodayFinnish", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns today in Finnish timezone", () => {
      vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
      expect(getTodayFinnish()).toBe("2026-02-03");
    });
  });

  describe("getReferenceWeekdayDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns today when today is Monday", () => {
      vi.setSystemTime(new Date("2026-02-02T12:00:00+02:00"));
      expect(getReferenceWeekdayDate()).toBe("2026-02-02");
    });

    it("returns today when today is Friday", () => {
      vi.setSystemTime(new Date("2026-01-30T12:00:00+02:00"));
      expect(getReferenceWeekdayDate()).toBe("2026-01-30");
    });

    it("returns next Monday when today is Saturday", () => {
      vi.setSystemTime(new Date("2026-01-31T12:00:00+02:00"));
      expect(getReferenceWeekdayDate()).toBe("2026-02-02");
    });

    it("returns next Monday when today is Sunday", () => {
      vi.setSystemTime(new Date("2026-02-01T12:00:00+02:00"));
      expect(getReferenceWeekdayDate()).toBe("2026-02-02");
    });
  });

  describe("getDefaultDateRange", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns last 14 days including today", () => {
      vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
      const { startDate, endDate } = getDefaultDateRange();
      expect(endDate).toBe("2026-02-03");
      expect(startDate).toBe("2026-01-21");
    });
  });

  describe("isEndDateInFuture", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns true when end date is after today", () => {
      vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
      expect(isEndDateInFuture("2026-02-04")).toBe(true);
    });

    it("returns false when end date is today", () => {
      vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
      expect(isEndDateInFuture("2026-02-03")).toBe(false);
    });

    it("returns false when end date is before today", () => {
      vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
      expect(isEndDateInFuture("2026-02-02")).toBe(false);
    });
  });
});
