import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRouteTodayGraphQL } from "./apiGraphql";
import type { TrainRecord } from "@/types/train";

/**
 * Integration test: verifies that the GraphQL query structure and response parsing
 * produce valid TrainRecord[] for the LPÄ–TPE route. Uses a mocked API response
 * so the test passes regardless of Digitraffic API availability (404/406 when
 * compression is required or service is unavailable).
 */
describe("apiGraphql integration", () => {
  const mockTrainsByDepartureDate = {
    data: {
      trainsByDepartureDate: [
        {
          trainNumber: 1719,
          departureDate: "2026-01-29",
          trainType: { name: "HL" },
          cancelled: false,
          timeTableRows: [
            {
              type: "DEPARTURE",
              station: { shortCode: "LPÄ" },
              scheduledTime: "2026-01-29T06:20:00.000Z",
              actualTime: "2026-01-29T06:20:00.000Z",
              differenceInMinutes: 0,
              cancelled: false,
            },
            {
              type: "ARRIVAL",
              station: { shortCode: "TPE" },
              scheduledTime: "2026-01-29T06:35:00.000Z",
              actualTime: "2026-01-29T06:35:00.000Z",
              differenceInMinutes: null,
              cancelled: false,
            },
          ],
        },
        {
          trainNumber: 9700,
          departureDate: "2026-01-29",
          trainType: { name: "HL" },
          cancelled: false,
          timeTableRows: [
            {
              type: "DEPARTURE",
              station: { shortCode: "TPE" },
              scheduledTime: "2026-01-29T14:35:00.000Z",
              actualTime: null,
              differenceInMinutes: null,
              cancelled: false,
            },
            {
              type: "ARRIVAL",
              station: { shortCode: "LPÄ" },
              scheduledTime: "2026-01-29T14:52:00.000Z",
              actualTime: null,
              differenceInMinutes: null,
              cancelled: false,
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTrainsByDepartureDate),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    "fetchRouteTodayGraphQL parses trainsByDepartureDate response into TrainRecords for LPÄ–TPE route",
    { timeout: 5000 },
    async () => {
      const result = await fetchRouteTodayGraphQL();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      for (const record of result) {
        expect(record).toMatchObject({
          date: expect.any(String),
          trainNumber: expect.any(Number),
          trainType: expect.any(String),
          cancelled: expect.any(Boolean),
          delayMinutes: expect.any(Number),
          status: expect.stringMatching(
            /^(ON_TIME|SLIGHT_DELAY|DELAYED|CANCELLED)$/
          ),
        } as Partial<TrainRecord>);
        expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(record.scheduledDeparture).toBeDefined();
        expect(record.scheduledArrival).toBeDefined();
      }

      const numbers = result.map((r) => r.trainNumber).sort((a, b) => a - b);
      expect(numbers).toEqual([1719, 9700]);
    }
  );

  it(
    "fetchRouteTodayGraphQL succeeds against real API and returns valid TrainRecords",
    { timeout: 15000 },
    async () => {
      vi.unstubAllGlobals();
      const result = await fetchRouteTodayGraphQL();
      expect(Array.isArray(result)).toBe(true);
      for (const record of result) {
        expect(record).toMatchObject({
          date: expect.any(String),
          trainNumber: expect.any(Number),
          trainType: expect.any(String),
          cancelled: expect.any(Boolean),
          delayMinutes: expect.any(Number),
          status: expect.stringMatching(
            /^(ON_TIME|SLIGHT_DELAY|DELAYED|CANCELLED)$/
          ),
        } as Partial<TrainRecord>);
        expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(record.scheduledDeparture).toBeDefined();
        expect(record.scheduledArrival).toBeDefined();
      }
    }
  );
});
