import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/test-utils";
import { Timeline } from "./Timeline";
import { TRAINS } from "@/types/train";
import type { TrainRecord } from "@/types/train";

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

describe("Timeline", () => {
  it("renders train title and direction", () => {
    render(
      <Timeline train={TRAINS.morning} records={[]} />
    );
    expect(
      screen.getByText(/Morning train 8:20 - Lempäälä → Tampere/)
    ).toBeInTheDocument();
  });

  it("shows empty state message when no records", () => {
    render(
      <Timeline train={TRAINS.morning} records={[]} />
    );
    expect(
      screen.getByText(/No data available for this train in the selected date range/)
    ).toBeInTheDocument();
  });

  it("renders legend labels when empty", () => {
    render(
      <Timeline train={TRAINS.morning} records={[]} />
    );
    expect(screen.getByText("On time")).toBeInTheDocument();
    expect(screen.getByText("2-5 min")).toBeInTheDocument();
    expect(screen.getByText(">5 min")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("renders one cell per record with correct content", () => {
    const records: TrainRecord[] = [
      createRecord({ date: "2026-01-27", status: "ON_TIME", delayMinutes: 0 }),
      createRecord({ date: "2026-01-28", status: "SLIGHT_DELAY", delayMinutes: 3 }),
      createRecord({ date: "2026-01-29", status: "CANCELLED", cancelled: true }),
    ];
    render(
      <Timeline train={TRAINS.morning} records={records} />
    );
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByText("X")).toBeInTheDocument();
  });

  it("applies correct Mantine color variable for cell background", () => {
    const records: TrainRecord[] = [
      createRecord({ date: "2026-01-27", status: "ON_TIME" }),
    ];
    const { container } = render(
      <Timeline train={TRAINS.morning} records={records} />
    );
    const cell = container.querySelector('[style*="mantine-color-green-5"]');
    expect(cell).toBeTruthy();
    expect((cell as HTMLElement).style.backgroundColor).toBe(
      "var(--mantine-color-green-5)"
    );
  });

  it("renders cells with date day in each cell", () => {
    const records: TrainRecord[] = [
      createRecord({ date: "2026-01-27" }),
    ];
    render(
      <Timeline train={TRAINS.morning} records={records} />
    );
    expect(screen.getByText("27")).toBeInTheDocument();
  });

  it("renders 1 min delay as ON_TIME with green cell and On time tooltip", () => {
    const records: TrainRecord[] = [
      createRecord({ date: "2026-01-27", status: "ON_TIME", delayMinutes: 1 }),
    ];
    const { container } = render(
      <Timeline train={TRAINS.morning} records={records} />
    );
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("On time")).toBeInTheDocument();
    const cell = container.querySelector('[style*="mantine-color-green-5"]');
    expect(cell).toBeTruthy();
  });

  it("renders evening train title when given evening config", () => {
    render(
      <Timeline train={TRAINS.evening} records={[]} />
    );
    expect(
      screen.getByText(/Evening train 16:35 - Tampere → Lempäälä/)
    ).toBeInTheDocument();
  });
});
