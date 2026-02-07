import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTrainFromStorage,
  setTrainInStorage,
  getNeededApiCalls,
  getApiCallsNeeded,
  getCachedData,
  cleanupOldStorage,
} from "./trainStorage";
import type { TrainRecord } from "@/types/train";

function createRecord(overrides: Partial<TrainRecord> = {}): TrainRecord {
  return {
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
  };
}

describe("trainStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Tuesday 2026-02-03
    vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe("getTrainFromStorage", () => {
    it("returns null for today's date", () => {
      localStorage.setItem("train:2026-02-03:1719", JSON.stringify(createRecord({ date: "2026-02-03" })));
      expect(getTrainFromStorage("2026-02-03", 1719)).toBeNull();
    });

    it("returns null when key is missing", () => {
      expect(getTrainFromStorage("2026-01-27", 1719)).toBeNull();
    });

    it("returns cached record for past date", () => {
      const record = createRecord({ date: "2026-01-27" });
      localStorage.setItem("train:2026-01-27:1719", JSON.stringify(record));
      const result = getTrainFromStorage("2026-01-27", 1719);
      expect(result).not.toBeNull();
      expect(result!.trainNumber).toBe(1719);
      expect(result!.date).toBe("2026-01-27");
    });

    it("re-derives status via getTrainStatus", () => {
      const record = createRecord({ date: "2026-01-27", delayMinutes: 3, status: "ON_TIME" });
      localStorage.setItem("train:2026-01-27:1719", JSON.stringify(record));
      const result = getTrainFromStorage("2026-01-27", 1719);
      // 3 min delay should be SLIGHT_DELAY, not ON_TIME
      expect(result!.status).toBe("SLIGHT_DELAY");
    });

    it("returns null for invalid JSON", () => {
      localStorage.setItem("train:2026-01-27:1719", "not json");
      expect(getTrainFromStorage("2026-01-27", 1719)).toBeNull();
    });
  });

  describe("setTrainInStorage", () => {
    it("does not store today's data", () => {
      const record = createRecord({ date: "2026-02-03" });
      setTrainInStorage("2026-02-03", 1719, record);
      expect(localStorage.getItem("train:2026-02-03:1719")).toBeNull();
    });

    it("stores data for past date", () => {
      const record = createRecord({ date: "2026-01-27" });
      setTrainInStorage("2026-01-27", 1719, record);
      expect(localStorage.getItem("train:2026-01-27:1719")).not.toBeNull();
    });
  });

  describe("getNeededApiCalls", () => {
    it("counts today as always needing an API call", () => {
      const count = getNeededApiCalls("2026-02-03", "2026-02-03", [1719, 9700]);
      expect(count).toBe(2); // today × 2 trains
    });

    it("counts past uncached days", () => {
      const count = getNeededApiCalls("2026-02-02", "2026-02-03", [1719, 9700]);
      // Mon 02-02: 2 uncached, Tue 02-03 (today): 2
      expect(count).toBe(4);
    });

    it("skips past cached days", () => {
      setTrainInStorage("2026-02-02", 1719, createRecord({ date: "2026-02-02" }));
      setTrainInStorage("2026-02-02", 9700, createRecord({ date: "2026-02-02", trainNumber: 9700 }));
      const count = getNeededApiCalls("2026-02-02", "2026-02-03", [1719, 9700]);
      // Mon 02-02: 0 (cached), Tue 02-03 (today): 2
      expect(count).toBe(2);
    });
  });

  describe("getApiCallsNeeded", () => {
    it("returns correct (date, trainNumber) pairs", () => {
      setTrainInStorage("2026-02-02", 1719, createRecord({ date: "2026-02-02" }));
      const pairs = getApiCallsNeeded("2026-02-02", "2026-02-03", [1719, 9700]);
      // Mon 02-02: 9700 uncached; Tue 02-03 (today): 1719 + 9700
      expect(pairs).toHaveLength(3);
      expect(pairs.some((p) => p.date === "2026-02-02" && p.trainNumber === 9700)).toBe(true);
      expect(pairs.some((p) => p.date === "2026-02-03" && p.trainNumber === 1719)).toBe(true);
      expect(pairs.some((p) => p.date === "2026-02-03" && p.trainNumber === 9700)).toBe(true);
    });
  });

  describe("getCachedData", () => {
    it("returns only cached records (excludes today)", () => {
      setTrainInStorage("2026-02-02", 1719, createRecord({ date: "2026-02-02" }));
      const records = getCachedData("2026-02-02", "2026-02-03", [1719, 9700]);
      expect(records).toHaveLength(1);
      expect(records[0]!.date).toBe("2026-02-02");
    });
  });

  describe("cleanupOldStorage", () => {
    it("removes entries older than 90 days", () => {
      localStorage.setItem("train:2025-10-01:1719", JSON.stringify(createRecord({ date: "2025-10-01" })));
      localStorage.setItem("train:2026-02-02:1719", JSON.stringify(createRecord({ date: "2026-02-02" })));
      cleanupOldStorage();
      expect(localStorage.getItem("train:2025-10-01:1719")).toBeNull();
      expect(localStorage.getItem("train:2026-02-02:1719")).not.toBeNull();
    });

    it("preserves train:route:* keys", () => {
      localStorage.setItem("train:route:weekday", JSON.stringify({ date: "2026-02-03", trains: [] }));
      localStorage.setItem("train:2025-10-01:1719", JSON.stringify(createRecord({ date: "2025-10-01" })));
      cleanupOldStorage();
      expect(localStorage.getItem("train:route:weekday")).not.toBeNull();
    });
  });
});
