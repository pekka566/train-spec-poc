import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchTrain,
  parseTrainResponse,
  getStationCodesByDirection,
} from "./api";
import type { TrainResponse } from "@/types/train";

describe("api", () => {
  describe("fetchTrain", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns train data on success", async () => {
      const mockResponse: TrainResponse[] = [
        {
          trainNumber: 1719,
          departureDate: "2026-01-27",
          trainType: "HL",
          operatorShortCode: "vr",
          runningCurrently: false,
          cancelled: false,
          timeTableRows: [],
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).toEqual(mockResponse[0]);
      expect(fetch).toHaveBeenCalledWith(
        "https://rata.digitraffic.fi/api/v1/trains/2026-01-27/1719"
      );
    });

    it("returns null for empty response", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).toBeNull();
    });

    it("returns null for 404", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).toBeNull();
    });

    it("returns null for unexpected JSON structure", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ foo: "bar" }]),
      } as Response);

      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).toBeNull();
    });

    it("throws on other HTTP errors", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(fetchTrain("2026-01-27", 1719)).rejects.toThrow(
        "API error: 500 Internal Server Error"
      );
    });
  });

  describe("parseTrainResponse", () => {
    it("parses morning train correctly", () => {
      const response: TrainResponse = {
        trainNumber: 1719,
        departureDate: "2026-01-27",
        trainType: "HL",
        operatorShortCode: "vr",
        runningCurrently: false,
        cancelled: false,
        timeTableRows: [
          {
            stationShortCode: "LPÄ",
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T06:20:00Z",
            actualTime: "2026-01-27T06:22:00Z",
            differenceInMinutes: 2,
            commercialStop: true,
            cancelled: false,
          },
          {
            stationShortCode: "TPE",
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T06:35:00Z",
            actualTime: "2026-01-27T06:37:00Z",
            differenceInMinutes: 2,
            commercialStop: true,
            cancelled: false,
          },
        ],
      };

      const record = parseTrainResponse(response);

      expect(record).not.toBeNull();
      expect(record?.date).toBe("2026-01-27");
      expect(record?.trainNumber).toBe(1719);
      expect(record?.delayMinutes).toBe(2);
      expect(record?.status).toBe("SLIGHT_DELAY");
      expect(record?.cancelled).toBe(false);
    });

    it("classifies 1 minute delay as ON_TIME", () => {
      const response: TrainResponse = {
        trainNumber: 1719,
        departureDate: "2026-01-27",
        trainType: "HL",
        operatorShortCode: "vr",
        runningCurrently: false,
        cancelled: false,
        timeTableRows: [
          {
            stationShortCode: "LPÄ",
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T06:20:00Z",
            actualTime: "2026-01-27T06:21:00Z",
            differenceInMinutes: 1,
            commercialStop: true,
            cancelled: false,
          },
          {
            stationShortCode: "TPE",
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T06:35:00Z",
            actualTime: "2026-01-27T06:36:00Z",
            differenceInMinutes: 1,
            commercialStop: true,
            cancelled: false,
          },
        ],
      };

      const record = parseTrainResponse(response);

      expect(record).not.toBeNull();
      expect(record?.delayMinutes).toBe(1);
      expect(record?.status).toBe("ON_TIME");
    });

    it("parses evening train correctly", () => {
      const response: TrainResponse = {
        trainNumber: 9700,
        departureDate: "2026-01-27",
        trainType: "HL",
        operatorShortCode: "vr",
        runningCurrently: false,
        cancelled: false,
        timeTableRows: [
          {
            stationShortCode: "TPE",
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T14:35:00Z",
            actualTime: "2026-01-27T14:35:00Z",
            differenceInMinutes: 0,
            commercialStop: true,
            cancelled: false,
          },
          {
            stationShortCode: "LPÄ",
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T14:50:00Z",
            actualTime: "2026-01-27T14:50:00Z",
            differenceInMinutes: 0,
            commercialStop: true,
            cancelled: false,
          },
        ],
      };

      const record = parseTrainResponse(response);

      expect(record).not.toBeNull();
      expect(record?.trainNumber).toBe(9700);
      expect(record?.status).toBe("ON_TIME");
    });

    it("handles cancelled train", () => {
      const response: TrainResponse = {
        trainNumber: 1719,
        departureDate: "2026-01-27",
        trainType: "HL",
        operatorShortCode: "vr",
        runningCurrently: false,
        cancelled: true,
        timeTableRows: [
          {
            stationShortCode: "LPÄ",
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T06:20:00Z",
            commercialStop: true,
            cancelled: true,
          },
          {
            stationShortCode: "TPE",
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T06:35:00Z",
            commercialStop: true,
            cancelled: true,
          },
        ],
      };

      const record = parseTrainResponse(response);

      expect(record).not.toBeNull();
      expect(record?.cancelled).toBe(true);
      expect(record?.status).toBe("CANCELLED");
      expect(record?.actualDeparture).toBeNull();
    });

    it("classifies delay >5min as DELAYED", () => {
      const response: TrainResponse = {
        trainNumber: 1719,
        departureDate: "2026-01-27",
        trainType: "HL",
        operatorShortCode: "vr",
        runningCurrently: false,
        cancelled: false,
        timeTableRows: [
          {
            stationShortCode: "LPÄ",
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T06:20:00Z",
            actualTime: "2026-01-27T06:28:00Z",
            differenceInMinutes: 8,
            commercialStop: true,
            cancelled: false,
          },
          {
            stationShortCode: "TPE",
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T06:35:00Z",
            actualTime: "2026-01-27T06:43:00Z",
            differenceInMinutes: 8,
            commercialStop: true,
            cancelled: false,
          },
        ],
      };

      const record = parseTrainResponse(response);

      expect(record?.status).toBe("DELAYED");
      expect(record?.delayMinutes).toBe(8);
    });

    it("returns null if departure row not found", () => {
      const response: TrainResponse = {
        trainNumber: 1719,
        departureDate: "2026-01-27",
        trainType: "HL",
        operatorShortCode: "vr",
        runningCurrently: false,
        cancelled: false,
        timeTableRows: [
          {
            stationShortCode: "TPE",
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T06:35:00Z",
            commercialStop: true,
            cancelled: false,
          },
        ],
      };

      const record = parseTrainResponse(response);
      expect(record).toBeNull();
    });
  });

  describe("getStationCodesByDirection", () => {
    it("returns LPÄ and TPE for Lempäälä → Tampere", () => {
      expect(getStationCodesByDirection("Lempäälä → Tampere")).toEqual({
        from: "LPÄ",
        to: "TPE",
      });
    });

    it("returns TPE and LPÄ for Tampere → Lempäälä", () => {
      expect(getStationCodesByDirection("Tampere → Lempäälä")).toEqual({
        from: "TPE",
        to: "LPÄ",
      });
    });
  });
});
