import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import {
  fetchTrain,
  parseTrainResponse,
  getStationCodesByDirection,
} from "./api";
import type { TrainResponse } from "@/types/train";

const REST_URL = "https://rata.digitraffic.fi/api/v1/trains/:date/:trainNumber";

describe("api", () => {
  describe("fetchTrain", () => {
    it("returns train data on success", async () => {
      // Default MSW handler returns train-1719 fixture
      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).not.toBeNull();
      expect(result?.trainNumber).toBe(1719);
      expect(result?.departureDate).toBe("2026-01-27");
      expect(result?.trainType).toBe("HL");
      expect(result?.timeTableRows).toHaveLength(2);
    });

    it("returns null for empty response", async () => {
      server.use(
        http.get(REST_URL, () => {
          return HttpResponse.json([]);
        })
      );
      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).toBeNull();
    });

    it("returns null for 404", async () => {
      server.use(
        http.get(REST_URL, () => {
          return new HttpResponse(null, { status: 404, statusText: "Not Found" });
        })
      );
      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).toBeNull();
    });

    it("returns null for unexpected JSON structure", async () => {
      server.use(
        http.get(REST_URL, () => {
          return HttpResponse.json([{ foo: "bar" }]);
        })
      );
      const result = await fetchTrain("2026-01-27", 1719);
      expect(result).toBeNull();
    });

    it("throws on other HTTP errors", async () => {
      server.use(
        http.get(REST_URL, () => {
          return new HttpResponse(null, {
            status: 500,
            statusText: "Internal Server Error",
          });
        })
      );
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
