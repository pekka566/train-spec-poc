import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRouteTodayGraphQL } from "./apiGraphql";

/**
 * Integration test: verifies that the minimal GraphQL query and response parsing
 * produce RouteTrainInfo[] (trainNumber, stationName, scheduledDeparture, direction) for both directions.
 * Uses a mocked API response so the test passes regardless of Digitraffic API availability.
 */
describe("apiGraphql integration", () => {
  const mockTrainsByDepartureDate = {
    data: {
      trainsByDepartureDate: [
        {
          trainNumber: 1719,
          timeTableRows: [
            { type: "DEPARTURE", scheduledTime: "2026-01-29T06:20:00.000Z", station: { name: "Lempäälä" } },
            { type: "ARRIVAL", scheduledTime: "2026-01-29T06:35:00.000Z", station: { name: "Tampere asema" } },
          ],
        },
        {
          trainNumber: 9700,
          timeTableRows: [
            { type: "DEPARTURE", scheduledTime: "2026-01-29T14:35:00.000Z", station: { name: "Tampere asema" } },
            { type: "ARRIVAL", scheduledTime: "2026-01-29T14:52:00.000Z", station: { name: "Lempäälä" } },
          ],
        },
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

  it(
    "fetchRouteTodayGraphQL parses response into RouteTrainInfo[] for both directions",
    { timeout: 5000 },
    async () => {
      const result = await fetchRouteTodayGraphQL();

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

  it(
    "fetchRouteTodayGraphQL succeeds against real API and returns minimal shape",
    { timeout: 15000 },
    async () => {
      vi.unstubAllGlobals();
      let result: Awaited<ReturnType<typeof fetchRouteTodayGraphQL>> | undefined;
      try {
        result = await fetchRouteTodayGraphQL();
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
