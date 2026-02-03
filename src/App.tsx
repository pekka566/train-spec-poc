import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Alert,
  Loader,
  Center,
  SimpleGrid,
  Box,
} from "@mantine/core";
import { IconAlertCircle, IconInbox } from "@tabler/icons-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { TabNavigation, type TabValue } from "@/components/TabNavigation";
import { SummaryCard } from "@/components/SummaryCard";
import { Timeline } from "@/components/Timeline";
import { DataTable } from "@/components/DataTable";
import { useTrainData } from "@/hooks/useTrainData";
import { getDefaultDateRange } from "@/utils/dateUtils";
import { computeSummary, filterByTrain } from "@/utils/statsCalculator";
import { TRAINS } from "@/types/train";

function App() {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [activeTab, setActiveTab] = useState<TabValue>("summary");

  const {
    data,
    isLoading,
    error,
    tooManyApiCalls,
    neededApiCalls,
    fetch,
    hasFetched,
  } = useTrainData(startDate, endDate);

  const morningRecords = filterByTrain(data, TRAINS.morning.number);
  const eveningRecords = filterByTrain(data, TRAINS.evening.number);

  const morningSummary = computeSummary(morningRecords);
  const eveningSummary = computeSummary(eveningRecords);

  const renderContent = () => {
    // Show error state
    if (error) {
      return (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          variant="light"
        >
          {error.message}
          <Box mt="sm">
            <Text
              size="sm"
              c="blue"
              style={{ cursor: "pointer" }}
              onClick={fetch}
            >
              Retry
            </Text>
          </Box>
        </Alert>
      );
    }

    // Show too many API calls error
    if (tooManyApiCalls && hasFetched) {
      return (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Too many API calls"
          color="orange"
          variant="light"
        >
          This date range would require more than 30 API calls.
          <br />
          Please narrow the range or use already cached data.
          <br />
          <Text size="sm" mt="xs" c="dimmed">
            (Would require {neededApiCalls} API calls. Maximum is 30.)
          </Text>
        </Alert>
      );
    }

    // Show loading state
    if (isLoading) {
      return (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Loader size="lg" />
            <Text c="dimmed">Fetching data...</Text>
          </Stack>
        </Center>
      );
    }

    // Show empty state if no data after fetch
    if (hasFetched && data.length === 0) {
      return (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconInbox size={48} color="gray" />
            <Text c="dimmed">No data</Text>
            <Text size="sm" c="dimmed">
              No train data found for the selected date range.
              <br />
              Try selecting a different period.
            </Text>
          </Stack>
        </Center>
      );
    }

    // Show initial state before fetch
    if (!hasFetched) {
      return (
        <Center py="xl">
          <Text c="dimmed">
            Select a date range and click "Fetch Data" to load train data.
          </Text>
        </Center>
      );
    }

    // Render content based on active tab
    switch (activeTab) {
      case "summary":
        return (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <SummaryCard
              train={TRAINS.morning}
              summary={morningSummary}
              variant="morning"
            />
            <SummaryCard
              train={TRAINS.evening}
              summary={eveningSummary}
              variant="evening"
            />
          </SimpleGrid>
        );

      case "timeline":
        return (
          <Stack gap="lg">
            <Timeline train={TRAINS.morning} records={morningRecords} />
            <Timeline train={TRAINS.evening} records={eveningRecords} />
          </Stack>
        );

      case "table":
        return (
          <Stack gap="lg">
            <DataTable train={TRAINS.morning} records={morningRecords} />
            <DataTable train={TRAINS.evening} records={eveningRecords} />
          </Stack>
        );
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Box ta="center">
          <Title order={1}>Commute Punctuality</Title>
          <Text c="dimmed">Lempäälä - Tampere</Text>
        </Box>

        {/* Date Range Picker */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onFetch={fetch}
          isLoading={isLoading}
          tooManyApiCalls={tooManyApiCalls}
          neededApiCalls={neededApiCalls}
        />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content Area */}
        {renderContent()}

        {/* Footer */}
        <Text size="sm" c="dimmed" ta="center">
          Data: Digitraffic / Fintraffic - Weekdays only
        </Text>
      </Stack>
    </Container>
  );
}

export default App;
