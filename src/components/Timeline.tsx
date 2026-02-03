import { Card, Text, Group, Stack, Box, Tooltip } from "@mantine/core";
import type { TrainRecord, TrainConfig } from "@/types/train";
import { formatFinnishDate } from "@/utils/dateUtils";
import { sortByDate } from "@/utils/statsCalculator";

interface TimelineProps {
  train: TrainConfig;
  records: TrainRecord[];
}

// Mantine CSS variables use hyphen: --mantine-color-green-5
const statusColors: Record<TrainRecord["status"], string> = {
  ON_TIME: "green-5",
  SLIGHT_DELAY: "yellow-5",
  DELAYED: "red-5",
  CANCELLED: "gray-6",
};

function getCellContent(record: TrainRecord): string {
  if (record.cancelled) return "X";
  if (record.delayMinutes <= 0) return "0";
  return `+${record.delayMinutes}`;
}

function getTooltipContent(record: TrainRecord): string {
  const dateStr = formatFinnishDate(record.date);
  if (record.cancelled) {
    return `${dateStr}: Cancelled`;
  }
  if (record.delayMinutes <= 0) {
    return `${dateStr}: On time`;
  }
  return `${dateStr}: +${record.delayMinutes} min delay`;
}

export function Timeline({ train, records }: TimelineProps) {
  // Sort oldest to newest for timeline display
  const sortedRecords = sortByDate(records, true);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Text fw={600}>
          {train.name} {train.scheduledTime} - {train.direction}
        </Text>

        {sortedRecords.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            No data available for this train in the selected date range.
          </Text>
        ) : (
          <Group gap="xs" wrap="wrap">
            {sortedRecords.map((record) => (
              <Tooltip key={record.date} label={getTooltipContent(record)} withArrow>
                <Box
                  w={44}
                  h={44}
                  style={{
                    backgroundColor: `var(--mantine-color-${statusColors[record.status]})`,
                    borderRadius: "var(--mantine-radius-sm)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Text size="sm" fw={600} c="white">
                    {getCellContent(record)}
                  </Text>
                  <Text size="xs" c="white" opacity={0.8}>
                    {record.date.slice(8)}
                  </Text>
                </Box>
              </Tooltip>
            ))}
          </Group>
        )}

        <Group gap="md" mt="xs">
          <LegendItem color="green-5" label="On time" />
          <LegendItem color="yellow-5" label="1-5 min" />
          <LegendItem color="red-5" label=">5 min" />
          <LegendItem color="gray-6" label="Cancelled" />
        </Group>
      </Stack>
    </Card>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
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
