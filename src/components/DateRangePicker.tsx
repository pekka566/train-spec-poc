import { Group, Button, Stack, Select } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import { getTodayFinnish, formatFinnishTime } from "@/utils/dateUtils";
import type { RouteTrainInfo } from "@/utils/apiGraphql";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFetch: () => void;
  isLoading: boolean;
  tooManyApiCalls: boolean;
  neededApiCalls: number;
  outboundOptions: RouteTrainInfo[];
  returnOptions: RouteTrainInfo[];
  selectedOutbound: RouteTrainInfo | null;
  selectedReturn: RouteTrainInfo | null;
  onOutboundChange: (train: RouteTrainInfo | null) => void;
  onReturnChange: (train: RouteTrainInfo | null) => void;
  noRouteData: boolean;
}

function optionLabel(t: RouteTrainInfo): string {
  return `${formatFinnishTime(t.scheduledDeparture)} (${t.trainNumber})`;
}

const byTime = (a: RouteTrainInfo, b: RouteTrainInfo) =>
  a.scheduledDeparture.localeCompare(b.scheduledDeparture);

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onFetch,
  isLoading,
  tooManyApiCalls,
  neededApiCalls,
  outboundOptions,
  returnOptions,
  selectedOutbound,
  selectedReturn,
  onOutboundChange,
  onReturnChange,
  noRouteData,
}: DateRangePickerProps) {
  const today = getTodayFinnish();
  const maxDate = dayjs(today).toDate();

  const handleStartChange = (value: Date | null) => {
    if (value) {
      onStartDateChange(dayjs(value).format("YYYY-MM-DD"));
    }
  };

  const handleEndChange = (value: Date | null) => {
    if (value) {
      onEndDateChange(dayjs(value).format("YYYY-MM-DD"));
    }
  };

  const outboundData = [...outboundOptions]
    .sort(byTime)
    .map((t) => ({
      value: String(t.trainNumber),
      label: optionLabel(t),
    }));
  const returnData = [...returnOptions]
    .sort(byTime)
    .map((t) => ({
      value: String(t.trainNumber),
      label: optionLabel(t),
    }));

  return (
    <Stack gap="xs">
      <Group gap="sm" wrap="wrap">
        <DateInput
          label="Start date"
          value={dayjs(startDate).toDate()}
          onChange={handleStartChange}
          maxDate={maxDate}
          valueFormat="YYYY-MM-DD"
          size="sm"
          style={{ flex: 1, minWidth: 140 }}
        />
        <DateInput
          label="End date"
          value={dayjs(endDate).toDate()}
          onChange={handleEndChange}
          maxDate={maxDate}
          valueFormat="YYYY-MM-DD"
          size="sm"
          style={{ flex: 1, minWidth: 140 }}
        />
        <Select
          label="Outbound train"
          placeholder={noRouteData ? "No route data" : undefined}
          data={outboundData}
          value={selectedOutbound ? String(selectedOutbound.trainNumber) : null}
          onChange={(value) => {
            const train = value
              ? outboundOptions.find((t) => String(t.trainNumber) === value) ?? null
              : null;
            onOutboundChange(train ?? null);
          }}
          disabled={noRouteData}
          clearable={false}
          size="sm"
          style={{ minWidth: 140 }}
        />
        <Select
          label="Return train"
          placeholder={noRouteData ? "No route data" : undefined}
          data={returnData}
          value={selectedReturn ? String(selectedReturn.trainNumber) : null}
          onChange={(value) => {
            const train = value
              ? returnOptions.find((t) => String(t.trainNumber) === value) ?? null
              : null;
            onReturnChange(train ?? null);
          }}
          disabled={noRouteData}
          clearable={false}
          size="sm"
          style={{ minWidth: 140 }}
        />
        <Button
          onClick={onFetch}
          loading={isLoading}
          disabled={tooManyApiCalls}
          leftSection={<IconSearch size={16} aria-hidden />}
          style={{ alignSelf: "flex-end" }}
        >
          Fetch Data
        </Button>
      </Group>
      {tooManyApiCalls && (
        <div
          role="alert"
          style={{
            color: "var(--mantine-color-red-6)",
            fontSize: "0.875rem",
          }}
        >
          Would require {neededApiCalls} API calls. Maximum is 30.
        </div>
      )}
    </Stack>
  );
}
