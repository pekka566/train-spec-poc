import { Group, Button, Stack } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import { getTodayFinnish } from "@/utils/dateUtils";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFetch: () => void;
  isLoading: boolean;
  tooManyApiCalls: boolean;
  neededApiCalls: number;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onFetch,
  isLoading,
  tooManyApiCalls,
  neededApiCalls,
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
        <Button
          onClick={onFetch}
          loading={isLoading}
          disabled={tooManyApiCalls}
          leftSection={<IconSearch size={16} />}
          style={{ alignSelf: "flex-end" }}
        >
          Fetch Data
        </Button>
      </Group>
      {tooManyApiCalls && (
        <div style={{ color: "var(--mantine-color-red-6)", fontSize: "0.875rem" }}>
          Would require {neededApiCalls} API calls. Maximum is {30}.
        </div>
      )}
    </Stack>
  );
}
