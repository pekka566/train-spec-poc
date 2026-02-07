import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchRouteTodayGraphQL,
  buildRouteQuery,
  runRouteFetchOnce,
  getRouteWeekdayFromStorage,
  getRouteTodayFromStorage,
  getRouteTrainsByDirection,
  filterReturnOptions,
} from "./apiGraphql";
import { getTodayFinnish } from "./dateUtils";

/** Mock timeTableRow shape; trainStopping must be true at Lempäälä for train to be included. */
type MockRow = {
  type: string;
  scheduledTime: string;
  station: { name: string };
  trainStopping?: boolean;
};

/** Mock train shape: trainType is object { name } per GraphQL TrainType type. */
const mockTrain = (
  trainNumber: number,
  trainTypeName: string,
  timeTableRows: MockRow[]
) => ({ trainNumber, trainType: { name: trainTypeName }, timeTableRows });

/**
 * Integration test: verifies that the minimal GraphQL query and response parsing
 * produce RouteTrainInfo[] (trainNumber, stationName, scheduledDeparture, direction) for both directions.
 * Uses a mocked API response so the test passes regardless of Digitraffic API availability.
 */
describe("apiGraphql integration", () => {
  const mockTrainsByDepartureDate = {
    data: {
      trainsByDepartureDate: [
        mockTrain(1719, "HL", [
          { type: "DEPARTURE", scheduledTime: "2026-01-29T06:20:00.000Z", station: { name: "Lempäälä" }, trainStopping: true },
          { type: "ARRIVAL", scheduledTime: "2026-01-29T06:35:00.000Z", station: { name: "Tampere asema" } },
        ]),
        mockTrain(9700, "HL", [
          { type: "DEPARTURE", scheduledTime: "2026-01-29T14:35:00.000Z", station: { name: "Tampere asema" } },
          { type: "ARRIVAL", scheduledTime: "2026-01-29T14:52:00.000Z", station: { name: "Lempäälä" }, trainStopping: true },
        ]),
      ],
    },
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(body.query ? mockTrainsByDepartureDate : { data: { trainsByDepartureDate: [] } }),
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("buildRouteQuery produces valid GraphQL with trainType subselection, station filters, and trainStopping", () => {
    const date = "2026-01-29";
    const query = buildRouteQuery(date);

    expect(query).toContain("query RouteToday");
    expect(query).toContain("trainsByDepartureDate");
    expect(query).toContain(`departureDate: "${date}"`);
    expect(query).toContain("trainType { name }");
    expect(query).toContain("timeTableRows(");
    expect(query).toContain("Lempäälä");
    expect(query).toContain("Tampere asema");
    expect(query).toContain("trainNumber");
    expect(query).toContain("orderBy: { trainNumber: ASCENDING }");
    expect(query).toContain("trainStopping");
  });

  it(
    "fetchRouteTodayGraphQL parses response into RouteTrainInfo[] for both directions",
    { timeout: 5000 },
    async () => {
      const result = await fetchRouteTodayGraphQL("2026-01-29");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      const byNumber = Object.fromEntries(result.map((r) => [r.trainNumber, r]));
      const train1719 = byNumber[1719];
      const train9700 = byNumber[9700];

      expect(train1719).toBeDefined();
      expect(train1719!.trainNumber).toBe(1719);
      expect(train1719!.stationName).toBe("Lempäälä");
      expect(train1719!.scheduledDeparture).toBe("2026-01-29T06:20:00.000Z");
      expect(train1719!.direction).toBe("Lempäälä → Tampere");

      expect(train9700).toBeDefined();
      expect(train9700!.trainNumber).toBe(9700);
      expect(train9700!.stationName).toBe("Tampere asema");
      expect(train9700!.scheduledDeparture).toBe("2026-01-29T14:35:00.000Z");
      expect(train9700!.direction).toBe("Tampere → Lempäälä");

      for (const item of result) {
        expect(item).toHaveProperty("trainNumber", expect.any(Number));
        expect(item).toHaveProperty("stationName", expect.any(String));
        expect(item).toHaveProperty("scheduledDeparture", expect.any(String));
        expect(item).toHaveProperty("direction", expect.any(String));
        expect(item.scheduledDeparture).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(["Lempäälä → Tampere", "Tampere → Lempäälä"]).toContain(item.direction);
      }
    }
  );

  it("filters out trains whose trainType.name is not in ALLOWED_TRAIN_TYPES", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                trainsByDepartureDate: [
                  mockTrain(1719, "HL", [
                    { type: "DEPARTURE", scheduledTime: "2026-01-29T06:20:00.000Z", station: { name: "Lempäälä" }, trainStopping: true },
                    { type: "ARRIVAL", scheduledTime: "2026-01-29T06:35:00.000Z", station: { name: "Tampere asema" } },
                  ]),
                  mockTrain(9999, "X", [
                    { type: "DEPARTURE", scheduledTime: "2026-01-29T07:00:00.000Z", station: { name: "Lempäälä" }, trainStopping: true },
                    { type: "ARRIVAL", scheduledTime: "2026-01-29T07:15:00.000Z", station: { name: "Tampere asema" } },
                  ]),
                ],
              },
            }),
        });
      })
    );
    const result = await fetchRouteTodayGraphQL("2026-01-29");
    expect(result).toHaveLength(1);
    expect(result[0]!.trainNumber).toBe(1719);
    vi.unstubAllGlobals();
  });

  it("excludes trains that pass through Lempäälä without stopping (trainStopping false at Lempäälä)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                trainsByDepartureDate: [
                  mockTrain(1719, "HL", [
                    { type: "DEPARTURE", scheduledTime: "2026-01-29T06:20:00.000Z", station: { name: "Lempäälä" }, trainStopping: true },
                    { type: "ARRIVAL", scheduledTime: "2026-01-29T06:35:00.000Z", station: { name: "Tampere asema" } },
                  ]),
                  mockTrain(8000, "HL", [
                    { type: "DEPARTURE", scheduledTime: "2026-01-29T07:00:00.000Z", station: { name: "Lempäälä" }, trainStopping: false },
                    { type: "ARRIVAL", scheduledTime: "2026-01-29T07:15:00.000Z", station: { name: "Tampere asema" } },
                  ]),
                ],
              },
            }),
        });
      })
    );
    const result = await fetchRouteTodayGraphQL("2026-01-29");
    expect(result).toHaveLength(1);
    expect(result[0]!.trainNumber).toBe(1719);
    vi.unstubAllGlobals();
  });

  it("runRouteFetchOnce stores weekday route and getRouteWeekdayFromStorage reads it", async () => {
    localStorage.removeItem("train:route:weekday");
    localStorage.removeItem("train:route:fetched");
    await runRouteFetchOnce();
    const stored = getRouteWeekdayFromStorage();
    expect(stored).not.toBeNull();
    expect(stored!.trains).toHaveLength(2);
    expect(stored!.date).toBeDefined();
    const byNumber = Object.fromEntries(stored!.trains.map((r) => [r.trainNumber, r]));
    expect(byNumber[1719]).toBeDefined();
    expect(byNumber[9700]).toBeDefined();
  });

  it("fetchRouteTodayGraphQL throws when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);
    await expect(fetchRouteTodayGraphQL("2026-01-29")).rejects.toThrow(
      "GraphQL error: 500 Internal Server Error"
    );
  });

  it("fetchRouteTodayGraphQL throws when response has errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ errors: [{ message: "Server error" }] }),
    } as Response);
    await expect(fetchRouteTodayGraphQL("2026-01-29")).rejects.toThrow(
      "Server error"
    );
  });

  it("excludes train with no departure at Lempäälä or Tampere (getDepartureAndDirection returns null)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            trainsByDepartureDate: [
              mockTrain(1719, "HL", [
                { type: "DEPARTURE", scheduledTime: "2026-01-29T06:20:00.000Z", station: { name: "Lempäälä" }, trainStopping: true },
                { type: "ARRIVAL", scheduledTime: "2026-01-29T06:35:00.000Z", station: { name: "Tampere asema" } },
              ]),
              mockTrain(9999, "HL", [
                { type: "ARRIVAL", scheduledTime: "2026-01-29T07:00:00.000Z", station: { name: "Lempäälä" }, trainStopping: true },
                { type: "ARRIVAL", scheduledTime: "2026-01-29T07:15:00.000Z", station: { name: "Tampere asema" } },
              ]),
            ],
          },
        }),
    } as Response);
    const result = await fetchRouteTodayGraphQL("2026-01-29");
    expect(result).toHaveLength(1);
    expect(result[0]!.trainNumber).toBe(1719);
  });

  describe("getRouteTodayFromStorage", () => {
    it("returns null when key is missing", () => {
      localStorage.removeItem("train:route:today:2026-01-27");
      expect(getRouteTodayFromStorage("2026-01-27")).toBeNull();
    });

    it("returns null when value is invalid JSON", () => {
      localStorage.setItem("train:route:today:2026-01-27", "not json");
      expect(getRouteTodayFromStorage("2026-01-27")).toBeNull();
    });

    it("returns null when payload has no date or trains", () => {
      localStorage.setItem("train:route:today:2026-01-27", "{}");
      expect(getRouteTodayFromStorage("2026-01-27")).toBeNull();
      localStorage.setItem("train:route:today:2026-01-27", JSON.stringify({ date: "2026-01-27" }));
      expect(getRouteTodayFromStorage("2026-01-27")).toBeNull();
    });

    it("returns payload when valid", () => {
      const payload = { date: "2026-01-27", trains: [{ trainNumber: 1719, stationName: "Lempäälä", scheduledDeparture: "2026-01-27T06:20:00Z", direction: "Lempäälä → Tampere" as const }] };
      localStorage.setItem("train:route:today:2026-01-27", JSON.stringify(payload));
      expect(getRouteTodayFromStorage("2026-01-27")).toEqual(payload);
    });
  });

  describe("getRouteWeekdayFromStorage", () => {
    it("returns null when key is missing", () => {
      localStorage.removeItem("train:route:weekday");
      expect(getRouteWeekdayFromStorage()).toBeNull();
    });

    it("returns null when value is invalid JSON", () => {
      localStorage.setItem("train:route:weekday", "not json");
      expect(getRouteWeekdayFromStorage()).toBeNull();
    });

    it("returns null when payload has no date or trains", () => {
      localStorage.setItem("train:route:weekday", "{}");
      expect(getRouteWeekdayFromStorage()).toBeNull();
    });

    it("returns payload when valid", () => {
      const payload = { date: "2026-01-29", trains: [{ trainNumber: 1719, stationName: "Lempäälä", scheduledDeparture: "2026-01-29T06:20:00Z", direction: "Lempäälä → Tampere" as const }] };
      localStorage.setItem("train:route:weekday", JSON.stringify(payload));
      expect(getRouteWeekdayFromStorage()).toEqual(payload);
      localStorage.removeItem("train:route:weekday");
    });
  });

  describe("getRouteTrainsByDirection", () => {
    it("splits trains by direction and sorts by scheduledDeparture", () => {
      const trains = [
        { trainNumber: 9700, stationName: "Tampere asema", scheduledDeparture: "2026-01-29T14:35:00Z", direction: "Tampere → Lempäälä" as const },
        { trainNumber: 1719, stationName: "Lempäälä", scheduledDeparture: "2026-01-29T06:20:00Z", direction: "Lempäälä → Tampere" as const },
      ];
      const { outbound, return: returnTrains } = getRouteTrainsByDirection(trains);
      expect(outbound).toHaveLength(1);
      expect(outbound[0]!.trainNumber).toBe(1719);
      expect(returnTrains).toHaveLength(1);
      expect(returnTrains[0]!.trainNumber).toBe(9700);
    });
  });

  describe("filterReturnOptions", () => {
    it("returns only return trains departing after selected outbound departure", () => {
      const returnTrains = [
        { trainNumber: 9700, stationName: "Tampere asema", scheduledDeparture: "2026-01-29T14:35:00Z", direction: "Tampere → Lempäälä" as const },
        { trainNumber: 9701, stationName: "Tampere asema", scheduledDeparture: "2026-01-29T16:00:00Z", direction: "Tampere → Lempäälä" as const },
      ];
      const filtered = filterReturnOptions(returnTrains, "2026-01-29T08:20:00Z");
      expect(filtered).toHaveLength(2);
      const filteredAfter = filterReturnOptions(returnTrains, "2026-01-29T15:00:00Z");
      expect(filteredAfter).toHaveLength(1);
      expect(filteredAfter[0]!.trainNumber).toBe(9701);
    });
  });

  it("runRouteFetchOnce does not fetch when already fetched today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-03T12:00:00+02:00"));
    const today = getTodayFinnish();
    localStorage.setItem("train:route:fetched", today);
    const payload = { date: "2026-01-29", trains: [{ trainNumber: 1719, stationName: "Lempäälä", scheduledDeparture: "2026-01-29T06:20:00Z", direction: "Lempäälä → Tampere" as const }] };
    localStorage.setItem("train:route:weekday", JSON.stringify(payload));
    await runRouteFetchOnce();
    const stored = getRouteWeekdayFromStorage();
    expect(stored!.trains).toHaveLength(1);
    expect(stored!.trains[0]!.trainNumber).toBe(1719);
    vi.useRealTimers();
  });

  it(
    "fetchRouteTodayGraphQL succeeds against real API and returns minimal shape",
    { timeout: 15000 },
    async () => {
      vi.unstubAllGlobals();
      let result: Awaited<ReturnType<typeof fetchRouteTodayGraphQL>> | undefined;
      try {
        result = await fetchRouteTodayGraphQL("2026-01-29");
      } catch (err) {
        if (err instanceof TypeError && (err.message === "fetch failed" || err.message.includes("ENOTFOUND"))) {
          return;
        }
        throw err;
      }
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      for (const item of result!) {
        expect(item).toHaveProperty("trainNumber", expect.any(Number));
        expect(item).toHaveProperty("stationName", expect.any(String));
        expect(item).toHaveProperty("scheduledDeparture", expect.any(String));
        expect(item).toHaveProperty("direction", expect.any(String));
      }
    }
  );
});
