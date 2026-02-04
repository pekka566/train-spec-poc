import { Group, Text, Box } from "@mantine/core";

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

interface StatusLegendProps {
  items: StatusLegendItem[];
  gap?: string;
  mt?: string;
  justify?: "center" | "flex-start" | "flex-end";
}

function LegendItem({ color, label }: StatusLegendItem) {
  return (
    <Group gap={4}>
      <Box
        w={12}
        h={12}
        style={{
          backgroundColor: `var(--mantine-color-${color})`,
          borderRadius: "var(--mantine-radius-xs)",
        }}
      />
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

export function StatusLegend({
  items,
  gap = "md",
  mt = "xs",
  justify,
}: StatusLegendProps) {
  return (
    <Group gap={gap} mt={mt} justify={justify}>
      {items.map((item) => (
        <LegendItem key={item.label} color={item.color} label={item.label} />
      ))}
    </Group>
  );
}
