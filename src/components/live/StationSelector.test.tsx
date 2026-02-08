import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { StationSelector } from "./StationSelector";

describe("StationSelector", () => {
  it("renders both direction options", () => {
    render(
      <StationSelector direction="to-tampere" onChange={vi.fn()} />,
    );
    expect(screen.getByText("Lempäälä → Tampere")).toBeInTheDocument();
    expect(screen.getByText("Tampere → Lempäälä")).toBeInTheDocument();
  });

  it("renders departure station label", () => {
    render(
      <StationSelector direction="to-tampere" onChange={vi.fn()} />,
    );
    expect(screen.getByText("Departure station")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(
      <StationSelector direction="to-tampere" onChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("radiogroup", { name: /departure station/i }),
    ).toBeInTheDocument();
  });
});
