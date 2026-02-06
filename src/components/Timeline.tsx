import { Card, Text, Title, Group, Stack, Tooltip } from "@mantine/core";
import type { TrainRecord, TrainConfig } from "@/types/train";
import { formatFinnishDate } from "@/utils/dateUtils";
import { getTrainTitle } from "@/utils/trainUtils";
import { sortByDate } from "@/utils/statsCalculator";
import { StatusLegend, STATUS_LEGEND_ITEMS } from "./StatusLegend";

interface TimelineProps {
  train: TrainConfig;
  records: TrainRecord[];
  /** When true, do not render the train line title (e.g. when used under a section header). */
  hideTitle?: boolean;
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
  if (record.status === "ON_TIME") {
    return `${dateStr}: On time`;
  }
  return `${dateStr}: +${record.delayMinutes} min delay`;
}

export function Timeline({
  train,
  records,
  hideTitle = false,
}: TimelineProps) {
  // Sort oldest to newest for timeline display
  const sortedRecords = sortByDate(records, true);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {!hideTitle && (
          <Title order={2} size="h4" fw={600}>
            {getTrainTitle(train)}
          </Title>
        )}

        {sortedRecords.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            No data available for this train in the selected date range.
          </Text>
        ) : (
          <Group gap="xs" wrap="wrap">
            {sortedRecords.map((record) => (
              <Tooltip
                key={record.date}
                label={getTooltipContent(record)}
                withArrow
              >
                <button
                  type="button"
                  aria-label={getTooltipContent(record)}
                  style={{
                    width: 44,
                    height: 44,
                    padding: 0,
                    border: "none",
                    borderRadius: "var(--mantine-radius-sm)",
                    backgroundColor: `var(--mantine-color-${statusColors[record.status]})`,
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
                </button>
              </Tooltip>
            ))}
          </Group>
        )}

        <StatusLegend items={STATUS_LEGEND_ITEMS} />
      </Stack>
    </Card>
  );
}
