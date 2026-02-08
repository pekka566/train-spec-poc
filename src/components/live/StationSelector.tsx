import { SegmentedControl, Text, Stack } from "@mantine/core";
import type { TravelDirection } from "@/types/live";

interface StationSelectorProps {
  direction: TravelDirection;
  onChange: (direction: TravelDirection) => void;
}

export function StationSelector({ direction, onChange }: StationSelectorProps) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500} id="station-selector-label">
        Departure station
      </Text>
      <SegmentedControl
        value={direction}
        onChange={(val) => onChange(val as TravelDirection)}
        aria-labelledby="station-selector-label"
        data={[
          { label: "Lempäälä → Tampere", value: "to-tampere" },
          { label: "Tampere → Lempäälä", value: "to-lempäälä" },
        ]}
        fullWidth
      />
    </Stack>
  );
}
