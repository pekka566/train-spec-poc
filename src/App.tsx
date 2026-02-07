import { useEffect, useRef, useState, useMemo } from "react";
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
  Button,
  Anchor,
} from "@mantine/core";
import { IconAlertCircle, IconInbox } from "@tabler/icons-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { TabNavigation, type TabValue } from "@/components/TabNavigation";
import { SummaryCard } from "@/components/SummaryCard";
import { Timeline } from "@/components/Timeline";
import { DataTable } from "@/components/DataTable";
import { useTrainData } from "@/hooks/useTrainData";
import {
  runRouteFetchOnce,
  getRouteWeekdayFromStorage,
  getRouteTrainsByDirection,
  filterReturnOptions,
  type RouteTrainInfo,
} from "@/utils/apiGraphql";
import {
  getDefaultDateRange,
  formatFinnishTime,
} from "@/utils/dateUtils";
import { computeSummary, filterByTrain } from "@/utils/statsCalculator";
import { getTrainTitle } from "@/utils/trainUtils";
import { TRAINS, type TrainConfig } from "@/types/train";
import type { TrainNumbers } from "@/utils/trainStorage";

function routeTrainToTrainConfig(route: RouteTrainInfo): TrainConfig {
  const time = formatFinnishTime(route.scheduledDeparture);
  const from = route.direction === "Lempäälä → Tampere" ? "LPÄ" : "TPE";
  const to = route.direction === "Lempäälä → Tampere" ? "TPE" : "LPÄ";
  return {
    number: route.trainNumber,
    name: `${time} (${route.trainNumber})`,
    from,
    to,
    scheduledTime: time,
    direction: route.direction,
  };
}

function App() {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [activeTab, setActiveTab] = useState<TabValue>("summary");
  const routeFetchStartedRef = useRef(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [routeStorageRevision, setRouteStorageRevision] = useState(0);

  const routeStorage = useMemo(
    () => getRouteWeekdayFromStorage(),
    [routeStorageRevision],
  );
  const { outbound: outboundList, return: returnList } = useMemo(() => {
    if (!routeStorage?.trains?.length) return { outbound: [], return: [] };
    return getRouteTrainsByDirection(routeStorage.trains);
  }, [routeStorage]);

  const [selectedOutbound, setSelectedOutbound] =
    useState<RouteTrainInfo | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<RouteTrainInfo | null>(
    null,
  );

  useEffect(() => {
    if (routeFetchStartedRef.current) return;
    routeFetchStartedRef.current = true;
    runRouteFetchOnce().then(() =>
      setRouteStorageRevision((r) => r + 1),
    );
  }, []);

  useEffect(() => {
    if (outboundList.length > 0 && !selectedOutbound) {
      setSelectedOutbound(
        outboundList.find((t) => t.trainNumber === TRAINS.morning.number) ??
          outboundList[0] ??
          null,
      );
    }
  }, [outboundList, selectedOutbound]);

  const returnOptions = useMemo(() => {
    if (!selectedOutbound) return returnList;
    return filterReturnOptions(returnList, selectedOutbound.scheduledDeparture);
  }, [returnList, selectedOutbound]);

  useEffect(() => {
    if (returnOptions.length === 0) {
      setSelectedReturn(null);
    } else {
      const stillValid =
        selectedReturn &&
        returnOptions.some((t) => t.trainNumber === selectedReturn.trainNumber);
      if (!stillValid) {
        setSelectedReturn(
          returnOptions.find((t) => t.trainNumber === TRAINS.evening.number) ??
            returnOptions[0] ??
            null,
        );
      }
    }
  }, [returnOptions, selectedReturn]);

  const trainNumbers: TrainNumbers = [
    selectedOutbound?.trainNumber ?? TRAINS.morning.number,
    selectedReturn?.trainNumber ?? TRAINS.evening.number,
  ];

  const morningTrainConfig: TrainConfig =
    selectedOutbound != null
      ? routeTrainToTrainConfig(selectedOutbound)
      : TRAINS.morning;
  const eveningTrainConfig: TrainConfig =
    selectedReturn != null
      ? routeTrainToTrainConfig(selectedReturn)
      : TRAINS.evening;

  const {
    data,
    isLoading,
    error,
    tooManyApiCalls,
    neededApiCalls,
    fetch,
    hasFetched,
  } = useTrainData(startDate, endDate, trainNumbers);

  const contentVisible =
    !error && !(tooManyApiCalls && hasFetched) && !isLoading;
  const prevContentVisibleRef = useRef(contentVisible);
  useEffect(() => {
    if (contentVisible && !prevContentVisibleRef.current) {
      const el = mainContentRef.current;
      if (el) {
        const id = requestAnimationFrame(() => {
          el.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(id);
      }
    }
    prevContentVisibleRef.current = contentVisible;
  }, [contentVisible]);

  const morningRecords = filterByTrain(data, trainNumbers[0]);
  const eveningRecords = filterByTrain(data, trainNumbers[1]);

  const morningSummary = computeSummary(morningRecords);
  const eveningSummary = computeSummary(eveningRecords);

  const renderContent = () => {
    // Show error state
    if (error) {
      return (
        <Alert
          icon={<IconAlertCircle size={16} aria-hidden />}
          title="Error"
          color="red"
          variant="light"
        >
          {error.message}
          <Box mt="sm">
            <Button variant="light" size="sm" onClick={fetch}>
              Retry
            </Button>
          </Box>
        </Alert>
      );
    }

    // Show too many API calls error
    if (tooManyApiCalls && hasFetched) {
      return (
        <Alert
          icon={<IconAlertCircle size={16} aria-hidden />}
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
        <Center py="xl" role="status" aria-live="polite" aria-atomic="true">
          <Stack align="center" gap="sm">
            <Loader size="lg" aria-hidden />
            <Text c="dimmed">Fetching data...</Text>
          </Stack>
        </Center>
      );
    }

    // Show empty state if no data after fetch
    if (hasFetched && data.length === 0) {
      return (
        <Center py="xl" role="status" aria-live="polite" aria-atomic="true">
          <Stack align="center" gap="sm">
            <IconInbox size={48} color="gray" aria-hidden />
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
        <Center py="xl" role="status" aria-live="polite" aria-atomic="true">
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
            <Stack gap="lg">
              <Title order={2} size="h4" fw={600}>
                {getTrainTitle(morningTrainConfig)}
              </Title>
              <SummaryCard
                train={morningTrainConfig}
                summary={morningSummary}
                variant="morning"
                hideTitle
              />
              <Timeline
                train={morningTrainConfig}
                records={morningRecords}
                hideTitle
              />
            </Stack>
            <Stack gap="lg">
              <Title order={2} size="h4" fw={600}>
                {getTrainTitle(eveningTrainConfig)}
              </Title>
              <SummaryCard
                train={eveningTrainConfig}
                summary={eveningSummary}
                variant="evening"
                hideTitle
              />
              <Timeline
                train={eveningTrainConfig}
                records={eveningRecords}
                hideTitle
              />
            </Stack>
          </SimpleGrid>
        );

      case "table":
        return (
          <Stack gap="lg">
            <DataTable train={morningTrainConfig} records={morningRecords} />
            <DataTable train={eveningTrainConfig} records={eveningRecords} />
          </Stack>
        );
    }
  };

  return (
    <Container size="lg" py="xl">
      <Anchor
        href="#main-content"
        size="sm"
        styles={{
          root: {
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
            zIndex: 9999,
            "&:focus, &:focus-visible": {
              width: "auto",
              height: "auto",
              padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
              margin: 0,
              overflow: "visible",
              clip: "auto",
              whiteSpace: "normal",
              left: "0.5rem",
              position: "fixed",
              background: "var(--mantine-color-default)",
              border: "1px solid var(--mantine-color-default-border)",
            },
          },
        }}
      >
        Skip to main content
      </Anchor>
      <Stack gap="lg">
        {/* Header */}
        <Box component="header" ta="center">
          <Title order={1}>Commute Punctuality</Title>
          <Text c="dimmed">Lempäälä - Tampere</Text>
        </Box>

        {/* Main: date picker, tabs, content */}
        <Box
          component="main"
          id="main-content"
          ref={mainContentRef}
          tabIndex={-1}
        >
          <Stack gap="lg">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onFetch={fetch}
              isLoading={isLoading}
              tooManyApiCalls={tooManyApiCalls}
              neededApiCalls={neededApiCalls}
              outboundOptions={outboundList}
              returnOptions={returnOptions}
              selectedOutbound={selectedOutbound}
              selectedReturn={selectedReturn}
              onOutboundChange={setSelectedOutbound}
              onReturnChange={setSelectedReturn}
              noRouteData={!routeStorage?.trains?.length}
            />

            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <Box
              component="section"
              role="region"
              aria-labelledby={`tab-${activeTab}`}
              id={`${activeTab}-panel`}
            >
              {renderContent()}
            </Box>
          </Stack>
        </Box>

        {/* Footer */}
        <Text size="sm" c="dimmed" ta="center">
          Data: Digitraffic / Fintraffic - Weekdays only
        </Text>
      </Stack>
    </Container>
  );
}

export default App;
