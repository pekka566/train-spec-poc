import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TrainCard } from "./TrainCard";
import type { LiveTrainInfo } from "@/types/live";

const makeTrainInfo = (
  overrides: Partial<LiveTrainInfo> = {},
): LiveTrainInfo => ({
  trainNumber: 1719,
  trainType: "HL",
  cancelled: false,
  runningCurrently: false,
  departure: {
    stationCode: "LPÄ",
    scheduledTime: "2026-01-27T06:20:00Z",
    estimatedTime: null,
    actualTime: null,
    delayMinutes: 0,
  },
  arrival: {
    stationCode: "TPE",
    scheduledTime: "2026-01-27T06:40:00Z",
    estimatedTime: null,
    actualTime: null,
    delayMinutes: 0,
  },
  status: "ON_TIME",
  phase: "upcoming",
  ...overrides,
});

describe("TrainCard", () => {
  it("renders train number and type", () => {
    render(
      <TrainCard
        train={makeTrainInfo()}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.getByText("HL 1719")).toBeInTheDocument();
  });

  it("renders track when commercialTrack is set", () => {
    render(
      <TrainCard
        train={makeTrainInfo({ commercialTrack: "1" })}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.getByText("Track 1")).toBeInTheDocument();
  });

  it("does not render track when commercialTrack is absent", () => {
    render(
      <TrainCard
        train={makeTrainInfo()}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.queryByText(/Track \d/)).not.toBeInTheDocument();
  });

  it("renders the label", () => {
    render(
      <TrainCard
        train={makeTrainInfo()}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.getByText("Next train")).toBeInTheDocument();
  });

  it("renders on-time status badge", () => {
    render(
      <TrainCard
        train={makeTrainInfo()}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.getByText("On time")).toBeInTheDocument();
  });

  it("renders delayed status badge", () => {
    render(
      <TrainCard
        train={makeTrainInfo({
          status: "DELAYED",
          departure: {
            stationCode: "LPÄ",
            scheduledTime: "2026-01-27T06:20:00Z",
            estimatedTime: "2026-01-27T06:28:00Z",
            actualTime: null,
            delayMinutes: 8,
          },
          arrival: {
            stationCode: "TPE",
            scheduledTime: "2026-01-27T06:40:00Z",
            estimatedTime: null,
            actualTime: null,
            delayMinutes: 0,
          },
        })}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.getByText("Delayed")).toBeInTheDocument();
  });

  it("renders cancelled status badge", () => {
    render(
      <TrainCard
        train={makeTrainInfo({
          status: "CANCELLED",
          cancelled: true,
        })}
        label="Next train"
        variant="primary"
      />,
    );
    // Badge + TimeBlock both say "Cancelled"
    const badges = screen.getAllByText("Cancelled");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows delay text for delayed train", () => {
    render(
      <TrainCard
        train={makeTrainInfo({
          status: "SLIGHT_DELAY",
          departure: {
            stationCode: "LPÄ",
            scheduledTime: "2026-01-27T06:20:00Z",
            estimatedTime: "2026-01-27T06:23:00Z",
            actualTime: null,
            delayMinutes: 3,
          },
          arrival: {
            stationCode: "TPE",
            scheduledTime: "2026-01-27T06:40:00Z",
            estimatedTime: null,
            actualTime: null,
            delayMinutes: 0,
          },
        })}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.getByText("+3 min")).toBeInTheDocument();
  });

  it("renders station codes in time blocks", () => {
    render(
      <TrainCard
        train={makeTrainInfo()}
        label="Next train"
        variant="primary"
      />,
    );
    expect(screen.getByText(/Departure \(LPÄ\)/)).toBeInTheDocument();
    expect(screen.getByText(/Arrival \(TPE\)/)).toBeInTheDocument();
  });

  it("shows running indicator when train is currently running", () => {
    render(
      <TrainCard
        train={makeTrainInfo({ runningCurrently: true })}
        label="Next train"
        variant="primary"
      />,
    );
    expect(
      screen.getByLabelText("Train is currently running"),
    ).toBeInTheDocument();
  });

  it("has aria-label on the card", () => {
    render(
      <TrainCard
        train={makeTrainInfo()}
        label="Next train"
        variant="primary"
      />,
    );
    expect(
      screen.getByLabelText("Next train: Train 1719"),
    ).toBeInTheDocument();
  });

  it("applies reduced opacity for past variant", () => {
    render(
      <TrainCard
        train={makeTrainInfo()}
        label="Previous train"
        variant="past"
      />,
    );
    const card = screen.getByLabelText("Previous train: Train 1719");
    expect(card.style.opacity).toBe("0.75");
  });
});
