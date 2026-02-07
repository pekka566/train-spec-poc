import { describe, it, expect, vi, beforeAll } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "@/test/test-utils";
import { DateRangePicker } from "./DateRangePicker";
import type { RouteTrainInfo } from "@/utils/apiGraphql";

// Mantine DateInput uses ResizeObserver (not available in jsdom)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const outboundOptions: RouteTrainInfo[] = [
  {
    trainNumber: 1719,
    stationName: "Lempäälä",
    scheduledDeparture: "2026-01-27T06:20:00Z",
    direction: "Lempäälä → Tampere",
  },
  {
    trainNumber: 1721,
    stationName: "Lempäälä",
    scheduledDeparture: "2026-01-27T07:20:00Z",
    direction: "Lempäälä → Tampere",
  },
];

const returnOptions: RouteTrainInfo[] = [
  {
    trainNumber: 9700,
    stationName: "Tampere asema",
    scheduledDeparture: "2026-01-27T14:35:00Z",
    direction: "Tampere → Lempäälä",
  },
];

const defaultProps = {
  startDate: "2026-01-27",
  endDate: "2026-02-03",
  onStartDateChange: vi.fn(),
  onEndDateChange: vi.fn(),
  onFetch: vi.fn(),
  isLoading: false,
  tooManyApiCalls: false,
  neededApiCalls: 4,
  outboundOptions,
  returnOptions,
  selectedOutbound: outboundOptions[0]!,
  selectedReturn: returnOptions[0]!,
  onOutboundChange: vi.fn(),
  onReturnChange: vi.fn(),
  noRouteData: false,
  isRouteLoading: false,
};

describe("DateRangePicker", () => {
  it("renders date inputs and Fetch button", () => {
    render(<DateRangePicker {...defaultProps} />);
    expect(screen.getByLabelText("Start date")).toBeInTheDocument();
    expect(screen.getByLabelText("End date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fetch data/i })).toBeInTheDocument();
  });

  it("renders train selection dropdowns", () => {
    render(<DateRangePicker {...defaultProps} />);
    expect(screen.getByRole("textbox", { name: "Outbound train" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Return train" })).toBeInTheDocument();
  });

  it("calls onFetch when Fetch button is clicked", () => {
    const onFetch = vi.fn();
    render(<DateRangePicker {...defaultProps} onFetch={onFetch} />);
    fireEvent.click(screen.getByRole("button", { name: /fetch data/i }));
    expect(onFetch).toHaveBeenCalledOnce();
  });

  it("disables Fetch button when tooManyApiCalls is true", () => {
    render(<DateRangePicker {...defaultProps} tooManyApiCalls={true} neededApiCalls={31} />);
    expect(screen.getByRole("button", { name: /fetch data/i })).toBeDisabled();
  });

  it("shows too many API calls warning", () => {
    render(<DateRangePicker {...defaultProps} tooManyApiCalls={true} neededApiCalls={35} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Would require 35 API calls. Maximum is 30."
    );
  });

  it("does not show warning when API calls are within limit", () => {
    render(<DateRangePicker {...defaultProps} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows loading state on Fetch button", () => {
    render(<DateRangePicker {...defaultProps} isLoading={true} />);
    const button = screen.getByRole("button", { name: /fetch data/i });
    // Mantine loading button gets data-loading attribute
    expect(button).toHaveAttribute("data-loading");
  });

  it("disables train selects when noRouteData is true", () => {
    render(<DateRangePicker {...defaultProps} noRouteData={true} />);
    // Mantine Select uses an input with disabled attribute
    const outbound = screen.getByRole("textbox", { name: "Outbound train" });
    const returnTrain = screen.getByRole("textbox", { name: "Return train" });
    expect(outbound).toBeDisabled();
    expect(returnTrain).toBeDisabled();
  });

  it("disables train selects when isRouteLoading is true", () => {
    render(<DateRangePicker {...defaultProps} isRouteLoading={true} />);
    const outbound = screen.getByRole("textbox", { name: "Outbound train" });
    expect(outbound).toBeDisabled();
  });
});
