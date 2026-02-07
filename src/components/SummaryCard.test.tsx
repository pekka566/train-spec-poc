import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/test-utils";
import { SummaryCard } from "./SummaryCard";
import { TRAINS } from "@/types/train";
import type { TrainSummary } from "@/types/train";

function createSummary(overrides: Partial<TrainSummary> = {}): TrainSummary {
  return {
    onTimePercent: 80,
    slightDelayPercent: 10,
    delayedPercent: 5,
    cancelledCount: 1,
    averageDelay: 0.5,
    totalCount: 20,
    onTimeCount: 16,
    slightDelayCount: 2,
    delayedCount: 1,
    ...overrides,
  };
}

describe("SummaryCard", () => {
  it("renders morning train title and direction (same format as Timeline)", () => {
    render(
      <SummaryCard train={TRAINS.morning} summary={createSummary()} variant="morning" />
    );
    expect(
      screen.getByText(/Morning train 8:20 – Lempäälä → Tampere/)
    ).toBeInTheDocument();
  });

  it("renders evening train title when variant is evening (same format as Timeline)", () => {
    render(
      <SummaryCard train={TRAINS.evening} summary={createSummary()} variant="evening" />
    );
    expect(
      screen.getByText(/Evening train 16:35 – Tampere → Lempäälä/)
    ).toBeInTheDocument();
  });

  it("displays on-time percentage and average delay", () => {
    const summary = createSummary({ onTimePercent: 92, averageDelay: 1.2 });
    render(
      <SummaryCard train={TRAINS.morning} summary={summary} variant="morning" />
    );
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("1.2")).toBeInTheDocument();
  });

  it("displays on-time count and total count", () => {
    const summary = createSummary({ onTimeCount: 11, totalCount: 12 });
    render(
      <SummaryCard train={TRAINS.morning} summary={summary} variant="morning" />
    );
    expect(screen.getByText("11 / 12")).toBeInTheDocument();
  });

  it("displays cancelled count", () => {
    const summary = createSummary({ cancelledCount: 2 });
    render(
      <SummaryCard train={TRAINS.morning} summary={summary} variant="morning" />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders legend labels", () => {
    render(
      <SummaryCard train={TRAINS.morning} summary={createSummary()} variant="morning" />
    );
    expect(screen.getByText("On time")).toBeInTheDocument();
    expect(screen.getByText("2-5 min")).toBeInTheDocument();
    expect(screen.getByText(">5 min")).toBeInTheDocument();
  });

  it("does not render train title when hideTitle is true", () => {
    render(
      <SummaryCard
        train={TRAINS.morning}
        summary={createSummary()}
        variant="morning"
        hideTitle
      />
    );
    expect(screen.queryByText(/Morning train 8:20 – Lempäälä → Tampere/)).not.toBeInTheDocument();
  });

  it("renders without error when totalCount is 0 (cancelled segment value 0)", () => {
    const summary = createSummary({
      totalCount: 0,
      onTimeCount: 0,
      slightDelayCount: 0,
      delayedCount: 0,
      cancelledCount: 0,
      onTimePercent: 0,
      slightDelayPercent: 0,
      delayedPercent: 0,
      averageDelay: 0,
    });
    render(
      <SummaryCard train={TRAINS.morning} summary={summary} variant="morning" />
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
