import { Card, Text, Group, Stack, Progress, SimpleGrid, Box } from "@mantine/core";
import type { TrainSummary, TrainConfig } from "@/types/train";

interface SummaryCardProps {
  train: TrainConfig;
  summary: TrainSummary;
  variant: "morning" | "evening";
}

const gradients = {
  morning: { from: "orange", to: "yellow", deg: 135 },
  evening: { from: "indigo", to: "violet", deg: 135 },
};

export function SummaryCard({ train, summary, variant }: SummaryCardProps) {
  const gradient = gradients[variant];

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      style={{
        background: `linear-gradient(${gradient.deg}deg, var(--mantine-color-${gradient.from}-5), var(--mantine-color-${gradient.to}-6))`,
        color: "white",
      }}
    >
      <Stack gap="md">
        <Box>
          <Text fw={700} size="lg" tt="uppercase">
            {variant === "morning" ? "Morning Train" : "Evening Train"} {train.scheduledTime}
          </Text>
          <Text size="sm" opacity={0.9}>
            {train.direction}
          </Text>
        </Box>

        <SimpleGrid cols={2} spacing="sm">
          <StatBox label="On Time" value={`${Math.round(summary.onTimePercent)}%`} />
          <StatBox label="Avg Delay (min)" value={summary.averageDelay.toFixed(1)} />
          <StatBox
            label="On Time"
            value={`${summary.onTimeCount} / ${summary.totalCount}`}
          />
          <StatBox label="Cancelled" value={String(summary.cancelledCount)} />
        </SimpleGrid>

        <Box>
          <Progress.Root size="lg" radius="xl">
            <Progress.Section
              value={summary.onTimePercent}
              color="green.5"
            />
            <Progress.Section
              value={summary.slightDelayPercent}
              color="yellow.5"
            />
            <Progress.Section
              value={summary.delayedPercent}
              color="red.5"
            />
            <Progress.Section
              value={
                summary.totalCount > 0
                  ? (summary.cancelledCount / summary.totalCount) * 100
                  : 0
              }
              color="gray.6"
            />
          </Progress.Root>
          <Group gap="xs" mt="xs" justify="center">
            <LegendItem color="green.5" label="On time" />
            <LegendItem color="yellow.5" label="1-5m" />
            <LegendItem color="red.5" label=">5m" />
          </Group>
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
        background: "rgba(255, 255, 255, 0.2)",
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
      <Text size="xs" opacity={0.9}>
        {label}
      </Text>
    </Group>
  );
}
