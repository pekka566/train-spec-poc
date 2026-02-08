import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { liveStationLPÄResponse } from "@/mocks/fixtures";
import { useLiveTrainData } from "./useLiveTrainData";

const LIVE_STATION_URL =
  "https://rata.digitraffic.fi/api/v1/live-trains/station/:stationCode";

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

describe("useLiveTrainData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns previous and next trains when refetch is called and API succeeds", async () => {
    const { result } = renderHook(
      () =>
        useLiveTrainData("to-tampere", [1719, 1721, 1723], true),
      {
        wrapper: createWrapper(),
      },
    );

    result.current.refetch();

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(
          result.current.previous.length > 0 || result.current.next.length > 0,
        ).toBe(true);
      },
      { timeout: 5000 },
    );

    expect(result.current.error).toBeNull();
    expect(Array.isArray(result.current.previous)).toBe(true);
    expect(Array.isArray(result.current.next)).toBe(true);
    expect(
      result.current.lastUpdated === null ||
        result.current.lastUpdated instanceof Date,
    ).toBe(true);
  }, 8000);

  it("does not fetch automatically (only on refetch)", async () => {
    const { result } = renderHook(
      () =>
        useLiveTrainData("to-tampere", [1719], true),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.previous).toEqual([]);
    expect(result.current.next).toEqual([]);
    expect(result.current.lastUpdated).toBeNull();
  });

  it("reports error when API fails on refetch", async () => {
    server.use(
      http.get(LIVE_STATION_URL, () => {
        return new HttpResponse(null, {
          status: 500,
          statusText: "Internal Server Error",
        });
      }),
    );

    const { result } = renderHook(
      () =>
        useLiveTrainData("to-tampere", [1719], true),
      {
        wrapper: createWrapper(),
      },
    );

    result.current.refetch();

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 },
    );

    expect(result.current.previous).toEqual([]);
    expect(result.current.next).toEqual([]);
  }, 8000);

  it("uses LPÄ station code for to-tampere direction", async () => {
    const { result } = renderHook(
      () =>
        useLiveTrainData("to-tampere", [1719, 1721, 1723], true),
      {
        wrapper: createWrapper(),
      },
    );

    result.current.refetch();

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        const train =
          result.current.previous[0] ?? result.current.next[0];
        expect(train?.departure.stationCode).toBe("LPÄ");
      },
      { timeout: 5000 },
    );

    const train =
      result.current.previous[0] ?? result.current.next[0];
    expect(train).toBeDefined();
    expect(train!.departure.stationCode).toBe("LPÄ");
    expect(train!.arrival.stationCode).toBe("TPE");
  }, 8000);

  it("uses TPE station code for to-lempäälä direction", async () => {
    const { result } = renderHook(
      () =>
        useLiveTrainData("to-lempäälä", [9700], true),
      {
        wrapper: createWrapper(),
      },
    );

    result.current.refetch();

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        const train =
          result.current.previous[0] ?? result.current.next[0];
        expect(train?.departure.stationCode).toBe("TPE");
      },
      { timeout: 5000 },
    );

    const train =
      result.current.previous[0] ?? result.current.next[0];
    expect(train).toBeDefined();
    expect(train!.departure.stationCode).toBe("TPE");
    expect(train!.arrival.stationCode).toBe("LPÄ");
  }, 8000);

  it("sends minutes_before_departure and minutes_after_departure in API request on refetch", async () => {
    let capturedUrl: string | null = null;
    server.use(
      http.get(LIVE_STATION_URL, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(liveStationLPÄResponse);
      }),
    );

    const { result } = renderHook(
      () =>
        useLiveTrainData("to-tampere", [1719, 1721, 1723], true, 90, 200),
      {
        wrapper: createWrapper(),
      },
    );

    result.current.refetch();

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(capturedUrl).not.toBeNull();
      },
      { timeout: 5000 },
    );

    const url = new URL(capturedUrl!);
    expect(url.searchParams.get("minutes_before_departure")).toBe("90");
    expect(url.searchParams.get("minutes_after_departure")).toBe("200");
  }, 8000);
});
