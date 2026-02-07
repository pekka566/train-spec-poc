import { describe, it, expect, beforeAll } from "vitest";
import { screen, within, fireEvent } from "@testing-library/react";
import { render } from "@/test/test-utils";

// Mantine ScrollArea uses ResizeObserver (not available in jsdom)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
import { DataTable } from "./DataTable";
import type { TrainConfig, TrainRecord } from "@/types/train";

const train: TrainConfig = {
  number: 1719,
  name: "08:20 (1719)",
  from: "LPÄ",
  to: "TPE",
  scheduledTime: "08:20",
  direction: "Lempäälä → Tampere",
};

function createRecord(overrides: Partial<TrainRecord> = {}): TrainRecord {
  return {
    date: "2026-01-27",
    trainNumber: 1719,
    trainType: "HL",
    cancelled: false,
    scheduledDeparture: "2026-01-27T06:20:00Z",
    actualDeparture: "2026-01-27T06:22:00Z",
    scheduledArrival: "2026-01-27T06:35:00Z",
    actualArrival: "2026-01-27T06:37:00Z",
    delayMinutes: 2,
    status: "SLIGHT_DELAY",
    ...overrides,
  };
}

describe("DataTable", () => {
  it("renders title", () => {
    render(<DataTable train={train} records={[]} />);
    expect(
      screen.getByRole("heading", { name: /08:20 \(1719\) – Lempäälä → Tampere/ })
    ).toBeInTheDocument();
  });

  it("renders table rows", () => {
    const records = [
      createRecord({ date: "2026-01-27" }),
      createRecord({ date: "2026-01-28" }),
    ];
    render(<DataTable train={train} records={records} />);
    const rows = screen.getAllByRole("row");
    // 1 header row + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("displays status badge", () => {
    render(<DataTable train={train} records={[createRecord()]} />);
    expect(screen.getByText("Slight delay")).toBeInTheDocument();
  });

  it("displays cancelled row with dashes", () => {
    const record = createRecord({
      cancelled: true,
      status: "CANCELLED",
      actualDeparture: null,
      actualArrival: null,
      delayMinutes: 0,
    });
    render(<DataTable train={train} records={[record]} />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    // Cancelled rows show "-" for actual departure and delay
    const row = screen.getAllByRole("row")[1]!;
    const cells = within(row).getAllByRole("cell");
    // Actual column (index 3) and Delay column (index 4) should contain "-"
    expect(cells[3]).toHaveTextContent("-");
    expect(cells[4]).toHaveTextContent("-");
  });

  it("toggles sort order on button click", () => {
    const records = [
      createRecord({ date: "2026-01-27" }),
      createRecord({ date: "2026-01-28" }),
    ];
    render(<DataTable train={train} records={records} />);

    // Initial sort is descending
    const sortButton = screen.getByRole("button", {
      name: /sort by date, descending/i,
    });
    expect(sortButton).toBeInTheDocument();

    // Click to switch to ascending
    fireEvent.click(sortButton);
    expect(
      screen.getByRole("button", { name: /sort by date, ascending/i })
    ).toBeInTheDocument();
  });

  it("shows delay in minutes for non-cancelled records", () => {
    render(
      <DataTable
        train={train}
        records={[createRecord({ delayMinutes: 3, status: "SLIGHT_DELAY" })]}
      />
    );
    expect(screen.getByText("+3min")).toBeInTheDocument();
  });

  it("shows 0min for on-time records", () => {
    render(
      <DataTable
        train={train}
        records={[createRecord({ delayMinutes: 0, status: "ON_TIME" })]}
      />
    );
    expect(screen.getByText("0min")).toBeInTheDocument();
  });
});
