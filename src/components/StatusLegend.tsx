import { Group, Text, Box } from "@mantine/core";
import type { StatusLegendItem } from "@/constants/statusLegend";

export type { StatusLegendItem } from "@/constants/statusLegend";

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
        aria-hidden
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
    <Group
      component="ul"
      gap={gap}
      mt={mt}
      justify={justify}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      {items.map((item) => (
        <Box component="li" key={item.label}>
          <LegendItem color={item.color} label={item.label} />
        </Box>
      ))}
    </Group>
  );
}
