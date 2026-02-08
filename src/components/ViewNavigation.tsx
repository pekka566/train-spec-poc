import { SegmentedControl } from "@mantine/core";

type ViewValue = "history" | "live";

interface ViewNavigationProps {
  currentView: ViewValue;
}

export function ViewNavigation({ currentView }: ViewNavigationProps) {
  return (
    <SegmentedControl
      value={currentView}
      onChange={(val) => {
        window.location.hash = val === "live" ? "#/live" : "#/";
      }}
      data={[
        { label: "Live Status", value: "live" },
        { label: "History", value: "history" },
      ]}
      aria-label="Switch between history and live views"
    />
  );
}
