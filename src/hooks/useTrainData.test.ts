import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import type { TrainNumbers } from "@/utils/trainStorage";
import type { TrainRecord } from "@/types/train";

const REST_URL = "https://rata.digitraffic.fi/api/v1/trains/:date/:trainNumber";

// Mock storage module (controls what API calls are "needed" and what's cached)
vi.mock("@/utils/trainStorage", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/utils/trainStorage")>();
  return {
    ...original,
    getNeededApiCalls: vi.fn(),
    getApiCallsNeeded: vi.fn(),
    getCachedData: vi.fn(),
    setTrainInStorage: vi.fn(),
    getTrainFromStorage: vi.fn(),
  };
});

// Mock isToday so we don't need fake timers (avoids waitFor/setTimeout conflicts)
vi.mock("@/utils/dateUtils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/utils/dateUtils")>();
  return {
    ...original,
    isToday: vi.fn((date: string) => date === "2026-02-03"),
  };
});

import { useTrainData } from "./useTrainData";
import {
  getNeededApiCalls,
  getApiCallsNeeded,
  getCachedData,
  getTrainFromStorage,
} from "@/utils/trainStorage";

const mockGetNeededApiCalls = vi.mocked(getNeededApiCalls);
const mockGetApiCallsNeeded = vi.mocked(getApiCallsNeeded);
const mockGetCachedData = vi.mocked(getCachedData);
const mockGetTrainFromStorage = vi.mocked(getTrainFromStorage);

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const trainNumbers: TrainNumbers = [1719, 9700];

describe("useTrainData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNeededApiCalls.mockReturnValue(2);
    mockGetApiCallsNeeded.mockReturnValue([]);
    mockGetCachedData.mockReturnValue([]);
    mockGetTrainFromStorage.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty data before fetch is called", () => {
    const { result } = renderHook(
      () => useTrainData("2026-02-02", "2026-02-03", trainNumbers),
      { wrapper: createWrapper() }
    );
    expect(result.current.data).toEqual([]);
    expect(result.current.hasFetched).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets tooManyApiCalls when needed calls exceed limit", () => {
    mockGetNeededApiCalls.mockReturnValue(31);
    const { result } = renderHook(
      () => useTrainData("2026-01-01", "2026-02-03", trainNumbers),
      { wrapper: createWrapper() }
    );
    expect(result.current.tooManyApiCalls).toBe(true);
    expect(result.current.neededApiCalls).toBe(31);
  });

  it("does not set tooManyApiCalls when calls are within limit", () => {
    mockGetNeededApiCalls.mockReturnValue(30);
    const { result } = renderHook(
      () => useTrainData("2026-02-02", "2026-02-03", trainNumbers),
      { wrapper: createWrapper() }
    );
    expect(result.current.tooManyApiCalls).toBe(false);
  });

  it("fetch() triggers data fetching via MSW", async () => {
    // isToday("2026-02-03") returns true, so cache is skipped
    mockGetApiCallsNeeded.mockReturnValue([{ date: "2026-02-03", trainNumber: 1719 }]);
    mockGetCachedData.mockReturnValue([]);

    const { result } = renderHook(
      () => useTrainData("2026-02-03", "2026-02-03", trainNumbers),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.fetch();
    });

    await waitFor(() => {
      expect(result.current.hasFetched).toBe(true);
      expect(result.current.data.length).toBeGreaterThanOrEqual(1);
    });

    // Verify the data came through the real API → MSW → real parse chain
    const record = result.current.data[0];
    expect(record?.trainNumber).toBe(1719);
    expect(record?.trainType).toBe("HL");
  });

  it("reports error when all API calls fail", async () => {
    // Override MSW handler to return 500
    server.use(
      http.get(REST_URL, () => {
        return new HttpResponse(null, {
          status: 500,
          statusText: "Internal Server Error",
        });
      })
    );

    mockGetApiCallsNeeded.mockReturnValue([{ date: "2026-02-02", trainNumber: 1719 }]);
    mockGetCachedData.mockReturnValue([]);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useTrainData("2026-02-02", "2026-02-03", trainNumbers),
      { wrapper }
    );

    act(() => {
      result.current.fetch();
    });

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 }
    );
  });

  it("reads from cache during fetch for past dates", async () => {
    const cachedRecord = createRecord({ date: "2026-02-02" });
    mockGetApiCallsNeeded.mockReturnValue([{ date: "2026-02-02", trainNumber: 1719 }]);
    // isToday("2026-02-02") returns false, so cache is checked
    mockGetTrainFromStorage.mockReturnValue(cachedRecord);
    mockGetCachedData.mockReturnValue([cachedRecord]);

    const { result } = renderHook(
      () => useTrainData("2026-02-02", "2026-02-03", trainNumbers),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.fetch();
    });

    await waitFor(() => {
      expect(result.current.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("does not fetch when tooManyApiCalls is true", () => {
    mockGetNeededApiCalls.mockReturnValue(31);
    const { result } = renderHook(
      () => useTrainData("2026-01-01", "2026-02-03", trainNumbers),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.fetch();
    });

    expect(result.current.hasFetched).toBe(true);
    // Query is disabled when tooManyApiCalls, so no data should be fetched
    expect(result.current.data).toEqual([]);
  });
});
