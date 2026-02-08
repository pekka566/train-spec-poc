import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import type { LiveTrainResponse, LiveTrainInfo } from "@/types/live";
import {
  fetchLiveStationTrains,
  parseLiveTrains,
  selectVisibleTrains,
} from "./apiLive";

const LIVE_STATION_URL =
  "https://rata.digitraffic.fi/api/v1/live-trains/station/:stationCode";

describe("apiLive", () => {
  describe("fetchLiveStationTrains", () => {
    it("returns train data on success", async () => {
      const result = await fetchLiveStationTrains("LPÄ");
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("trainNumber");
    });

    it("returns empty array for unknown station", async () => {
      const result = await fetchLiveStationTrains("XXX");
      expect(result).toEqual([]);
    });

    it("throws on HTTP error", async () => {
      server.use(
        http.get(LIVE_STATION_URL, () => {
          return new HttpResponse(null, {
            status: 500,
            statusText: "Internal Server Error",
          });
        }),
      );
      await expect(fetchLiveStationTrains("LPÄ")).rejects.toThrow(
        "Live API error: 500 Internal Server Error",
      );
    });

    it("returns empty array for non-array response", async () => {
      server.use(
        http.get(LIVE_STATION_URL, () => {
          return HttpResponse.json({ error: "not found" });
        }),
      );
      const result = await fetchLiveStationTrains("LPÄ");
      expect(result).toEqual([]);
    });

    it("passes minutes_before_departure and minutes_after_departure in request URL", async () => {
      server.use(
        http.get(LIVE_STATION_URL, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("minutes_before_departure")).toBe("60");
          expect(url.searchParams.get("minutes_after_departure")).toBe("120");
          return HttpResponse.json([]);
        }),
      );
      const result = await fetchLiveStationTrains("LPÄ", 60, 120);
      expect(result).toEqual([]);
    });
  });

  describe("parseLiveTrains", () => {
    const makeTrain = (
      trainNumber: number,
      overrides: Partial<LiveTrainResponse> = {},
      depOverrides: Record<string, unknown> = {},
      arrOverrides: Record<string, unknown> = {},
    ): LiveTrainResponse => ({
      trainNumber,
      departureDate: "2026-01-27",
      trainType: "HL",
      trainCategory: "Commuter",
      runningCurrently: false,
      cancelled: false,
      timeTableRows: [
        {
          stationShortCode: "LPÄ",
          stationUICCode: 300,
          type: "DEPARTURE",
          trainStopping: true,
          cancelled: false,
          scheduledTime: "2026-01-27T06:20:00Z",
          differenceInMinutes: 0,
          ...depOverrides,
        },
        {
          stationShortCode: "TPE",
          stationUICCode: 160,
          type: "ARRIVAL",
          trainStopping: true,
          cancelled: false,
          scheduledTime: "2026-01-27T06:40:00Z",
          differenceInMinutes: 0,
          ...arrOverrides,
        },
      ],
      ...overrides,
    });

    it("filters to only route train numbers", () => {
      const trains = [makeTrain(1719), makeTrain(999)];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.trainNumber).toBe(1719);
    });

    it("correctly maps to-tampere direction (LPÄ→TPE)", () => {
      const trains = [makeTrain(1719)];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.departure.stationCode).toBe("LPÄ");
      expect(result[0]!.arrival.stationCode).toBe("TPE");
    });

    it("correctly maps to-lempäälä direction (TPE→LPÄ)", () => {
      const train: LiveTrainResponse = {
        trainNumber: 9700,
        departureDate: "2026-01-27",
        trainType: "HL",
        trainCategory: "Commuter",
        runningCurrently: false,
        cancelled: false,
        timeTableRows: [
          {
            stationShortCode: "TPE",
            stationUICCode: 160,
            type: "DEPARTURE",
            trainStopping: true,
            cancelled: false,
            scheduledTime: "2026-01-27T14:35:00Z",
            differenceInMinutes: 0,
          },
          {
            stationShortCode: "LPÄ",
            stationUICCode: 300,
            type: "ARRIVAL",
            trainStopping: true,
            cancelled: false,
            scheduledTime: "2026-01-27T14:55:00Z",
            differenceInMinutes: 0,
          },
        ],
      };
      const result = parseLiveTrains(
        [train],
        "to-lempäälä",
        new Set([9700]),
      );
      expect(result[0]!.departure.stationCode).toBe("TPE");
      expect(result[0]!.arrival.stationCode).toBe("LPÄ");
    });

    it("classifies on-time train", () => {
      const trains = [makeTrain(1719)];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.status).toBe("ON_TIME");
      expect(result[0]!.departure.delayMinutes).toBe(0);
    });

    it("classifies slight delay (2-5 min)", () => {
      const trains = [
        makeTrain(1719, {}, { differenceInMinutes: 3 }),
      ];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.status).toBe("SLIGHT_DELAY");
      expect(result[0]!.departure.delayMinutes).toBe(3);
    });

    it("classifies delayed (>5 min)", () => {
      const trains = [
        makeTrain(1719, {}, { differenceInMinutes: 8 }),
      ];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.status).toBe("DELAYED");
    });

    it("classifies cancelled train", () => {
      const trains = [makeTrain(1719, { cancelled: true })];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.status).toBe("CANCELLED");
      expect(result[0]!.cancelled).toBe(true);
      expect(result[0]!.departure.delayMinutes).toBe(0);
    });

    it("determines departed phase when actualTime present", () => {
      const trains = [
        makeTrain(
          1719,
          {},
          { actualTime: "2026-01-27T06:22:00Z" },
        ),
      ];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.phase).toBe("departed");
    });

    it("determines upcoming phase when no actualTime", () => {
      const trains = [makeTrain(1719)];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.phase).toBe("upcoming");
    });

    it("includes liveEstimateTime as estimatedTime", () => {
      const trains = [
        makeTrain(
          1719,
          {},
          { liveEstimateTime: "2026-01-27T06:22:00Z" },
          { liveEstimateTime: "2026-01-27T06:42:00Z" },
        ),
      ];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([1719]),
      );
      expect(result[0]!.departure.estimatedTime).toBe(
        "2026-01-27T06:22:00Z",
      );
      expect(result[0]!.arrival.estimatedTime).toBe(
        "2026-01-27T06:42:00Z",
      );
    });

    it("skips trains missing departure or arrival row", () => {
      const train: LiveTrainResponse = {
        trainNumber: 1719,
        departureDate: "2026-01-27",
        trainType: "HL",
        trainCategory: "Commuter",
        runningCurrently: false,
        cancelled: false,
        timeTableRows: [
          {
            stationShortCode: "LPÄ",
            stationUICCode: 300,
            type: "DEPARTURE",
            trainStopping: true,
            cancelled: false,
            scheduledTime: "2026-01-27T06:20:00Z",
            differenceInMinutes: 0,
          },
          // Missing TPE ARRIVAL
        ],
      };
      const result = parseLiveTrains(
        [train],
        "to-tampere",
        new Set([1719]),
      );
      expect(result).toHaveLength(0);
    });

    it("sorts by scheduled departure time", () => {
      const train1 = makeTrain(1721, {}, { scheduledTime: "2026-01-27T07:20:00Z" }, { scheduledTime: "2026-01-27T07:40:00Z" });
      const train2 = makeTrain(1719, {}, { scheduledTime: "2026-01-27T06:20:00Z" }, { scheduledTime: "2026-01-27T06:40:00Z" });
      const result = parseLiveTrains(
        [train1, train2],
        "to-tampere",
        new Set([1719, 1721]),
      );
      expect(result[0]!.trainNumber).toBe(1719);
      expect(result[1]!.trainNumber).toBe(1721);
    });

    it("returns empty array when no matching trains", () => {
      const trains = [makeTrain(1719)];
      const result = parseLiveTrains(
        trains,
        "to-tampere",
        new Set([9999]),
      );
      expect(result).toEqual([]);
    });
  });

  describe("selectVisibleTrains", () => {
    const makeInfo = (
      trainNumber: number,
      scheduledDep: string,
    ): LiveTrainInfo => ({
      trainNumber,
      trainType: "HL",
      cancelled: false,
      runningCurrently: false,
      departure: {
        stationCode: "LPÄ",
        scheduledTime: scheduledDep,
        estimatedTime: null,
        actualTime: null,
        delayMinutes: 0,
      },
      arrival: {
        stationCode: "TPE",
        scheduledTime: scheduledDep,
        estimatedTime: null,
        actualTime: null,
        delayMinutes: 0,
      },
      status: "ON_TIME",
      phase: "upcoming",
    });

    it("returns all departed as previous and all upcoming as next", () => {
      const trains = [
        makeInfo(1715, "2026-01-27T05:20:00Z"),
        makeInfo(1719, "2026-01-27T06:20:00Z"),
        makeInfo(1721, "2026-01-27T07:20:00Z"),
        makeInfo(1723, "2026-01-27T08:20:00Z"),
      ];
      const now = "2026-01-27T06:30:00Z";
      const result = selectVisibleTrains(trains, now);

      expect(result.previous).toHaveLength(2);
      expect(result.previous[0]!.trainNumber).toBe(1715);
      expect(result.previous[1]!.trainNumber).toBe(1719);
      expect(result.next).toHaveLength(2);
      expect(result.next[0]!.trainNumber).toBe(1721);
      expect(result.next[1]!.trainNumber).toBe(1723);
    });

    it("returns empty previous when all trains are upcoming", () => {
      const trains = [
        makeInfo(1721, "2026-01-27T07:20:00Z"),
        makeInfo(1723, "2026-01-27T08:20:00Z"),
      ];
      const now = "2026-01-27T05:00:00Z";
      const result = selectVisibleTrains(trains, now);

      expect(result.previous).toHaveLength(0);
      expect(result.next).toHaveLength(2);
    });

    it("returns empty next when all trains have departed", () => {
      const trains = [
        makeInfo(1715, "2026-01-27T05:20:00Z"),
        makeInfo(1719, "2026-01-27T06:20:00Z"),
      ];
      const now = "2026-01-27T10:00:00Z";
      const result = selectVisibleTrains(trains, now);

      expect(result.previous).toHaveLength(2);
      expect(result.previous[1]!.trainNumber).toBe(1719);
      expect(result.next).toHaveLength(0);
    });

    it("handles empty train list", () => {
      const result = selectVisibleTrains([], "2026-01-27T06:30:00Z");
      expect(result.previous).toHaveLength(0);
      expect(result.next).toHaveLength(0);
    });

    it("returns all upcoming trains in next (no limit)", () => {
      const trains = [
        makeInfo(1721, "2026-01-27T07:20:00Z"),
        makeInfo(1723, "2026-01-27T08:20:00Z"),
        makeInfo(1725, "2026-01-27T09:20:00Z"),
      ];
      const now = "2026-01-27T05:00:00Z";
      const result = selectVisibleTrains(trains, now);

      expect(result.next).toHaveLength(3);
      expect(result.next[0]!.trainNumber).toBe(1721);
      expect(result.next[2]!.trainNumber).toBe(1725);
    });

    it("returns all departed trains in previous (no limit)", () => {
      const trains = [
        makeInfo(1715, "2026-01-27T05:20:00Z"),
        makeInfo(1717, "2026-01-27T05:50:00Z"),
        makeInfo(1719, "2026-01-27T06:20:00Z"),
      ];
      const now = "2026-01-27T07:00:00Z";
      const result = selectVisibleTrains(trains, now);

      expect(result.previous).toHaveLength(3);
      expect(result.previous[0]!.trainNumber).toBe(1715);
      expect(result.previous[2]!.trainNumber).toBe(1719);
    });
  });
});
