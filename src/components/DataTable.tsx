import {
  Table,
  Badge,
  Card,
  Text,
  Title,
  Stack,
  ScrollArea,
  UnstyledButton,
} from "@mantine/core";
import { useState } from "react";
import type { TrainRecord, TrainConfig } from "@/types/train";
import { formatFinnishDate, formatFinnishTime } from "@/utils/dateUtils";
import { getTrainTitle } from "@/utils/trainUtils";
import { sortByDate } from "@/utils/statsCalculator";

interface DataTableProps {
  train: TrainConfig;
  records: TrainRecord[];
}

const statusColors = {
  ON_TIME: "green",
  SLIGHT_DELAY: "yellow",
  DELAYED: "red",
  CANCELLED: "gray",
};

const statusLabels = {
  ON_TIME: "On time",
  SLIGHT_DELAY: "Slight delay",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
};

export function DataTable({ train, records }: DataTableProps) {
  const [sortAscending, setSortAscending] = useState(false);

  const sortedRecords = sortByDate(records, sortAscending);

  const toggleSort = () => {
    setSortAscending((prev) => !prev);
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Title order={2} size="h4" fw={600}>
          {getTrainTitle(train)}
        </Title>

        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  aria-sort={
                    sortAscending ? "ascending" : "descending"
                  }
                >
                  <UnstyledButton
                    onClick={toggleSort}
                    style={{
                      cursor: "pointer",
                      userSelect: "none",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    Date {sortAscending ? "(ascending ^)" : "(descending v)"}
                  </UnstyledButton>
                </Table.Th>
                <Table.Th>Train</Table.Th>
                <Table.Th>Scheduled</Table.Th>
                <Table.Th>Actual</Table.Th>
                <Table.Th>Delay</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedRecords.map((record) => (
                <Table.Tr key={record.date}>
                  <Table.Td>{formatFinnishDate(record.date)}</Table.Td>
                  <Table.Td>
                    {record.trainType} {record.trainNumber}
                  </Table.Td>
                  <Table.Td>{formatFinnishTime(record.scheduledDeparture)}</Table.Td>
                  <Table.Td>
                    {record.cancelled
                      ? "-"
                      : record.actualDeparture
                        ? formatFinnishTime(record.actualDeparture)
                        : "-"}
                  </Table.Td>
                  <Table.Td>
                    {record.cancelled ? (
                      "-"
                    ) : (
                      <Text
                        span
                        c={statusColors[record.status]}
                        fw={500}
                      >
                        {record.delayMinutes > 0
                          ? `+${record.delayMinutes}min`
                          : "0min"}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={statusColors[record.status]} variant="filled">
                      {statusLabels[record.status]}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Card>
  );
}
