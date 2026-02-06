import {
  Card,
  Text,
  Title,
  Stack,
  Progress,
  SimpleGrid,
  Box,
} from "@mantine/core";
import type { TrainSummary, TrainConfig } from "@/types/train";
import { StatusLegend, STATUS_LEGEND_ITEMS } from "./StatusLegend";

const cardBackgroundColor = {
  morning: "var(--mantine-color-lime-0)",
  evening: "var(--mantine-color-cyan-0)",
} as const;

interface SummaryCardProps {
  train: TrainConfig;
  summary: TrainSummary;
  variant: "morning" | "evening";
}

export function SummaryCard({ train, summary, variant }: SummaryCardProps) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ backgroundColor: cardBackgroundColor[variant] }}
    >
      <Stack gap="md" style={{ color: "black" }}>
        <Title order={2} size="h4" fw={600}>
          {train.name.includes("(")
            ? `${train.name} – ${train.direction}`
            : `${train.name} ${train.scheduledTime} – ${train.direction}`}
        </Title>

        <SimpleGrid cols={2} spacing="sm">
          <StatBox
            label="On Time"
            value={`${Math.round(summary.onTimePercent)}%`}
          />
          <StatBox
            label="Avg Delay (min)"
            value={summary.averageDelay.toFixed(1)}
          />
          <StatBox
            label="On Time"
            value={`${summary.onTimeCount} / ${summary.totalCount}`}
          />
          <StatBox label="Cancelled" value={String(summary.cancelledCount)} />
        </SimpleGrid>

        <Box>
          <Progress.Root size="lg" radius="xl">
            <Progress.Section value={summary.onTimePercent} color="green.5" />
            <Progress.Section
              value={summary.slightDelayPercent}
              color="yellow.5"
            />
            <Progress.Section value={summary.delayedPercent} color="red.5" />
            <Progress.Section
              value={
                summary.totalCount > 0
                  ? (summary.cancelledCount / summary.totalCount) * 100
                  : 0
              }
              color="gray.6"
            />
          </Progress.Root>
          <StatusLegend items={STATUS_LEGEND_ITEMS} gap="xs" justify="center" />
        </Box>
      </Stack>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Box
      p="xs"
      style={{
        background: "white",
        borderRadius: "var(--mantine-radius-sm)",
        textAlign: "center",
      }}
    >
      <Text size="xl" fw={700}>
        {value}
      </Text>
      <Text size="xs" opacity={0.9}>
        {label}
      </Text>
    </Box>
  );
}
