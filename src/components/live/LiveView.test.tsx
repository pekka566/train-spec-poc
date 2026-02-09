import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { LiveView } from "./LiveView";

vi.mock("@/hooks/useLiveTrainData", () => ({
  useLiveTrainData: vi.fn(),
}));

vi.mock("@/utils/apiGraphql", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/apiGraphql")>();
  return {
    ...actual,
    runRouteFetchOnce: vi.fn().mockResolvedValue(undefined),
    getRouteWeekdayFromStorage: vi.fn(),
    getRouteTrainsByDirection: vi.fn(),
  };
});

import { useLiveTrainData } from "@/hooks/useLiveTrainData";
import {
  getRouteWeekdayFromStorage,
  getRouteTrainsByDirection,
} from "@/utils/apiGraphql";

const mockUseLiveTrainData = vi.mocked(useLiveTrainData);
const mockGetRouteWeekdayFromStorage = vi.mocked(getRouteWeekdayFromStorage);
const mockGetRouteTrainsByDirection = vi.mocked(getRouteTrainsByDirection);

describe("LiveView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRouteWeekdayFromStorage.mockReturnValue({
      date: "2026-01-27",
      trains: [
        {
          trainNumber: 1719,
          stationName: "Lempäälä",
          scheduledDeparture: "2026-01-27T06:20:00Z",
          direction: "Lempäälä → Tampere",
        },
        {
          trainNumber: 9700,
          stationName: "Tampere",
          scheduledDeparture: "2026-01-27T14:35:00Z",
          direction: "Tampere → Lempäälä",
        },
      ],
    });
    mockGetRouteTrainsByDirection.mockReturnValue({
      outbound: [
        {
          trainNumber: 1719,
          stationName: "Lempäälä",
          scheduledDeparture: "2026-01-27T06:20:00Z",
          direction: "Lempäälä → Tampere",
        },
      ],
      return: [
        {
          trainNumber: 9700,
          stationName: "Tampere",
          scheduledDeparture: "2026-01-27T14:35:00Z",
          direction: "Tampere → Lempäälä",
        },
      ],
    });
    mockUseLiveTrainData.mockReturnValue({
      previous: [],
      next: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
      isFetched: false,
      refetch: vi.fn(),
    });
  });

  it("renders Live Status heading and view navigation", async () => {
    render(<LiveView />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Live Status" })).toBeInTheDocument();
    });
    expect(
      screen.getByRole("radiogroup", {
        name: "Switch between history and live views",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("renders station selector after route load", async () => {
    render(<LiveView />);

    await waitFor(() => {
      expect(screen.getByText("Departure station")).toBeInTheDocument();
    });
    expect(screen.getByText("Lempäälä → Tampere")).toBeInTheDocument();
    expect(screen.getByText("Tampere → Lempäälä")).toBeInTheDocument();
  });

  it("shows train cards when data exists, or no empty message until search is run", async () => {
    render(<LiveView />);

    await waitFor(() => {
      expect(screen.getByText("Departure station")).toBeInTheDocument();
    });

    const noTrains = screen.queryByText(/No trains found for this direction/);
    const onTime = screen.queryByText("On time");
    expect(noTrains === null || onTime !== null).toBe(true);
  });

  it("renders minute controls and passes them to useLiveTrainData", async () => {
    render(<LiveView />);

    await waitFor(() => {
      expect(screen.getByLabelText("Minutes before current time")).toBeInTheDocument();
      expect(screen.getByLabelText("Minutes after current time")).toBeInTheDocument();
    });

    expect(mockUseLiveTrainData).toHaveBeenCalledWith(
      "to-tampere",
      [1719],
      true,
      30,
      120
    );
  });

  it("renders current date/time, search window text and Search button", async () => {
    render(<LiveView />);

    await waitFor(() => {
      expect(screen.getByText(/Current date and time:/)).toBeInTheDocument();
      expect(screen.getByText(/Search window:/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Search/ })).toBeInTheDocument();
    });
  });
});
