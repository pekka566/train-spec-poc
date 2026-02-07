export interface StatusLegendItem {
  color: string;
  label: string;
}

/** Legend items (4 statuses) */
export const STATUS_LEGEND_ITEMS: StatusLegendItem[] = [
  { color: "green-5", label: "On time" },
  { color: "yellow-5", label: "2-5 min" },
  { color: "red-5", label: ">5 min" },
  { color: "gray-6", label: "Cancelled" },
];
