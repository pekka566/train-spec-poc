import { Card, Text, Group, Badge, Stack, SimpleGrid, Box } from "@mantine/core";
import { IconTrain } from "@tabler/icons-react";
import type { LiveTrainInfo } from "@/types/live";
import type { TrainStatus } from "@/types/train";
import { formatFinnishTime } from "@/utils/dateUtils";

const STATUS_COLORS: Record<TrainStatus, string> = {
  ON_TIME: "green",
  SLIGHT_DELAY: "yellow",
  DELAYED: "red",
  CANCELLED: "gray",
};

const STATUS_LABELS: Record<TrainStatus, string> = {
  ON_TIME: "On time",
  SLIGHT_DELAY: "Slight delay",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
};

const STATUS_BORDER_COLORS: Record<TrainStatus, string> = {
  ON_TIME: "var(--mantine-color-green-5)",
  SLIGHT_DELAY: "var(--mantine-color-yellow-5)",
  DELAYED: "var(--mantine-color-red-5)",
  CANCELLED: "var(--mantine-color-gray-6)",
};

const DELAY_TEXT_COLORS: Record<TrainStatus, string> = {
  ON_TIME: "var(--mantine-color-green-9)",
  SLIGHT_DELAY: "var(--mantine-color-yellow-9)",
  DELAYED: "var(--mantine-color-red-7)",
  CANCELLED: "var(--mantine-color-gray-6)",
};

interface TrainCardProps {
  train: LiveTrainInfo;
  label: string;
  variant: "past" | "primary" | "secondary";
}

function formatBestTime(
  scheduled: string,
  estimated: string | null,
  actual: string | null
): string {
  if (actual) return formatFinnishTime(actual);
  if (estimated) return formatFinnishTime(estimated);
  return formatFinnishTime(scheduled);
}

function getDelayText(delayMinutes: number, cancelled: boolean): string {
  if (cancelled) return "Cancelled";
  if (delayMinutes === 0) return "0 min";
  return `+${delayMinutes} min`;
}

export function TrainCard({ train, label, variant }: TrainCardProps) {
  const isPast = variant === "past";

  return (
    <Card
      shadow={isPast ? "xs" : "sm"}
      padding="lg"
      radius="md"
      withBorder
      style={{
        borderLeftWidth: 4,
        borderLeftColor: STATUS_BORDER_COLORS[train.status],
        opacity: isPast ? 0.75 : 1,
      }}
      aria-label={
        label ? `${label}: Train ${train.trainNumber}` : `Train ${train.trainNumber}`
      }
    >
      <Stack gap="sm">
        {/* Header row: label + train info + status badge */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTrain size={18} aria-hidden />
            <div>
              {label ? (
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {label}
                </Text>
              ) : null}
              <Text fw={600}>
                {train.trainType} {train.trainNumber}
                {train.commercialTrack ? (
                  <Text component="span" size="sm" c="dimmed" fw={400} ml="xs">
                    Track {train.commercialTrack}
                  </Text>
                ) : null}
              </Text>
            </div>
          </Group>
          <Group gap="xs">
            {train.runningCurrently && (
              <Box
                w={8}
                h={8}
                aria-label="Train is currently running"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-blue-5)",
                  animation: "pulse 2s infinite",
                }}
              />
            )}
            <Badge color={STATUS_COLORS[train.status]} variant="light" size="lg">
              {STATUS_LABELS[train.status]}
            </Badge>
          </Group>
        </Group>

        {/* Times grid */}
        <SimpleGrid cols={2} spacing="sm">
          <TimeBlock
            stationLabel="Departure"
            stationCode={train.departure.stationCode}
            scheduledTime={train.departure.scheduledTime}
            bestTime={formatBestTime(
              train.departure.scheduledTime,
              train.departure.estimatedTime,
              train.departure.actualTime
            )}
            isActual={!!train.departure.actualTime}
            delayMinutes={train.departure.delayMinutes}
            cancelled={train.cancelled}
            status={train.status}
          />
          <TimeBlock
            stationLabel="Arrival"
            stationCode={train.arrival.stationCode}
            scheduledTime={train.arrival.scheduledTime}
            bestTime={formatBestTime(
              train.arrival.scheduledTime,
              train.arrival.estimatedTime,
              train.arrival.actualTime
            )}
            isActual={!!train.arrival.actualTime}
            delayMinutes={train.arrival.delayMinutes}
            cancelled={train.cancelled}
            status={train.status}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

function TimeBlock({
  stationLabel,
  stationCode,
  scheduledTime,
  bestTime,
  isActual,
  delayMinutes,
  cancelled,
  status,
}: {
  stationLabel: string;
  stationCode: string;
  scheduledTime: string;
  bestTime: string;
  isActual: boolean;
  delayMinutes: number;
  cancelled: boolean;
  status: TrainStatus;
}) {
  const scheduled = formatFinnishTime(scheduledTime);
  const hasDelay = !cancelled && delayMinutes > 0;
  const showBestTime = bestTime !== scheduled;

  return (
    <Box
      p="xs"
      style={{
        background: "var(--mantine-color-gray-0)",
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      <Text size="xs" c="dimmed">
        {stationLabel} ({stationCode})
      </Text>
      <Group gap="xs" align="baseline">
        <Text
          size="lg"
          fw={700}
          td={showBestTime ? "line-through" : undefined}
          c={showBestTime ? "dimmed" : undefined}
        >
          {scheduled}
        </Text>
        {showBestTime && (
          <Text size="lg" fw={700}>
            {bestTime}
          </Text>
        )}
        {isActual && (
          <Text size="xs" c="dimmed">
            actual
          </Text>
        )}
      </Group>
      <Text size="sm" fw={500} style={{ color: DELAY_TEXT_COLORS[status] }}>
        {hasDelay || cancelled ? getDelayText(delayMinutes, cancelled) : "On schedule"}
      </Text>
    </Box>
  );
}
