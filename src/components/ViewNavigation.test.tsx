import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ViewNavigation } from "./ViewNavigation";

describe("ViewNavigation", () => {
  it("renders History and Live Status options", () => {
    render(<ViewNavigation currentView="history" />);
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Live Status")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<ViewNavigation currentView="history" />);
    expect(
      screen.getByRole("radiogroup", {
        name: /switch between history and live views/i,
      })
    ).toBeInTheDocument();
  });

  it("selects history when currentView is history", () => {
    render(<ViewNavigation currentView="history" />);
    const historyRadio = screen.getByRole("radio", { name: "History" });
    expect(historyRadio).toBeChecked();
  });

  it("selects live when currentView is live", () => {
    render(<ViewNavigation currentView="live" />);
    const liveRadio = screen.getByRole("radio", { name: "Live Status" });
    expect(liveRadio).toBeChecked();
  });
});
