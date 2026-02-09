import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Alert,
  Loader,
  Center,
  Box,
  Button,
  Anchor,
  Group,
  NumberInput,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { getAppVersion } from "@/utils/versionCheck";
import { ViewNavigation } from "@/components/ViewNavigation";
import { StationSelector } from "./StationSelector";
import { TrainCard } from "./TrainCard";
import { StatusLegend } from "@/components/StatusLegend";
import { STATUS_LEGEND_ITEMS } from "@/constants/statusLegend";
import { useLiveTrainData } from "@/hooks/useLiveTrainData";
import {
  runRouteFetchOnce,
  getRouteWeekdayFromStorage,
  getRouteTrainsByDirection,
} from "@/utils/apiGraphql";
import { formatFinnishDate, formatFinnishTime, getTodayFinnish } from "@/utils/dateUtils";
import type { TravelDirection } from "@/types/live";

const DEFAULT_MINUTES_BEFORE = 30;
const DEFAULT_MINUTES_AFTER = 120;

export function LiveView() {
  const [direction, setDirection] = useState<TravelDirection>("to-tampere");
  const [minutesBeforeDeparture, setMinutesBeforeDeparture] =
    useState(DEFAULT_MINUTES_BEFORE);
  const [minutesAfterDeparture, setMinutesAfterDeparture] =
    useState(DEFAULT_MINUTES_AFTER);
  const routeFetchStartedRef = useRef(false);
  const [routeStorageRevision, setRouteStorageRevision] = useState(0);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState<Error | null>(null);

  const routeStorage = useMemo(
    () => getRouteWeekdayFromStorage(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeStorageRevision]
  );

  const { outbound, return: returnList } = useMemo(() => {
    if (!routeStorage?.trains?.length) return { outbound: [], return: [] };
    return getRouteTrainsByDirection(routeStorage.trains);
  }, [routeStorage]);

  const routeTrainNumbers = useMemo(() => {
    const list = direction === "to-tampere" ? outbound : returnList;
    return list.map((t) => t.trainNumber);
  }, [direction, outbound, returnList]);

  const doRouteFetch = useCallback(() => {
    setIsRouteLoading(true);
    setRouteError(null);
    runRouteFetchOnce()
      .then(() => setRouteStorageRevision((r) => r + 1))
      .catch((err) => {
        setRouteError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setIsRouteLoading(false));
  }, []);

  useEffect(() => {
    if (routeFetchStartedRef.current) return;
    routeFetchStartedRef.current = true;
    doRouteFetch();
  }, [doRouteFetch]);

  const retryRouteFetch = useCallback(() => {
    routeFetchStartedRef.current = false;
    doRouteFetch();
  }, [doRouteFetch]);

  const { previous, next, isLoading, error, lastUpdated, isFetched, refetch } =
    useLiveTrainData(
      direction,
      routeTrainNumbers,
      !isRouteLoading && !routeError && routeTrainNumbers.length > 0,
      minutesBeforeDeparture,
      minutesAfterDeparture
    );

  const hasData = previous.length > 0 || next.length > 0;

  const now = new Date();
  const windowStart = new Date(now.getTime() - minutesBeforeDeparture * 60 * 1000);
  const windowEnd = new Date(now.getTime() + minutesAfterDeparture * 60 * 1000);
  const searchWindowText = `${formatFinnishTime(windowStart.toISOString())} – ${formatFinnishTime(windowEnd.toISOString())}`;

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
        <Box component="header" ta="center">
          <Title order={1}>Live Status</Title>
          <Text c="dimmed">Lempäälä – Tampere</Text>
        </Box>

        <Center>
          <ViewNavigation currentView="live" />
        </Center>

        <Box component="main" id="main-content" tabIndex={-1}>
          <Stack gap="lg">
            <StationSelector direction={direction} onChange={setDirection} />

            <Group gap="md" wrap="wrap" align="center">
              <Text size="sm">
                Current date and time:{" "}
                <Text component="span" fw={700}>
                  {formatFinnishDate(getTodayFinnish())}{" "}
                  {formatFinnishTime(now.toISOString())}
                </Text>
              </Text>
              <Text size="sm">
                Search window:{" "}
                <Text component="span" fw={700}>
                  {searchWindowText}
                </Text>
              </Text>
            </Group>

            <Group align="flex-end" gap="sm" wrap="wrap">
              <NumberInput
                label="Minutes before current time"
                description="Time window start (relative to now)"
                value={minutesBeforeDeparture}
                onChange={(v) =>
                  setMinutesBeforeDeparture(typeof v === "string" ? 0 : (v ?? 0))
                }
                min={0}
                max={1440}
                aria-label="Minutes before current time"
                style={{ minWidth: 140 }}
              />
              <NumberInput
                label="Minutes after current time"
                description="Time window end (relative to now)"
                value={minutesAfterDeparture}
                onChange={(v) =>
                  setMinutesAfterDeparture(typeof v === "string" ? 0 : (v ?? 0))
                }
                min={0}
                max={1440}
                aria-label="Minutes after current time"
                style={{ minWidth: 140 }}
              />
              <Button
                variant="light"
                size="sm"
                onClick={() => {
                  setMinutesBeforeDeparture(DEFAULT_MINUTES_BEFORE);
                  setMinutesAfterDeparture(DEFAULT_MINUTES_AFTER);
                }}
                aria-label="Reset time window to defaults"
              >
                Reset to default
              </Button>
              <Button
                variant="filled"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                aria-label="Search"
              >
                Search
              </Button>
            </Group>

            {routeError && (
              <Alert
                icon={<IconAlertCircle size={16} aria-hidden />}
                title="Failed to load train routes"
                color="red"
              >
                {routeError.message}
                <Box mt="sm">
                  <Button variant="outline" size="sm" onClick={retryRouteFetch}>
                    Retry
                  </Button>
                </Box>
              </Alert>
            )}

            {isRouteLoading && (
              <Center py="xl" role="status" aria-live="polite" aria-atomic="true">
                <Stack align="center" gap="sm">
                  <Loader size="lg" aria-hidden />
                  <Text c="dimmed">Loading train routes...</Text>
                </Stack>
              </Center>
            )}

            {!isRouteLoading && !routeError && isLoading && (
              <Center py="xl" role="status" aria-live="polite" aria-atomic="true">
                <Stack align="center" gap="sm">
                  <Loader size="lg" aria-hidden />
                  <Text c="dimmed">Loading live data...</Text>
                </Stack>
              </Center>
            )}

            {!isRouteLoading && !routeError && !isLoading && !error && !isFetched && (
              <Center py="xl" role="status" aria-live="polite" aria-atomic="true">
                <Text c="dimmed">Click &quot;Search&quot; to load train data.</Text>
              </Center>
            )}

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} aria-hidden />}
                title="Error loading live data"
                color="red"
              >
                {error.message}
              </Alert>
            )}

            {hasData && (
              <Stack gap="md">
                {previous.map((train) => (
                  <TrainCard
                    key={`${train.departure.scheduledTime}-${train.trainNumber}`}
                    train={train}
                    label=""
                    variant="past"
                  />
                ))}
                {next.map((train, i) => (
                  <TrainCard
                    key={`${train.departure.scheduledTime}-${train.trainNumber}`}
                    train={train}
                    label=""
                    variant={i === 0 ? "primary" : "secondary"}
                  />
                ))}

                <StatusLegend items={STATUS_LEGEND_ITEMS} gap="md" justify="center" />

                {lastUpdated && (
                  <Text size="xs" c="dimmed" ta="center">
                    Last updated: {formatFinnishTime(lastUpdated.toISOString())}
                  </Text>
                )}
              </Stack>
            )}

            {isFetched &&
              !isLoading &&
              !error &&
              !isRouteLoading &&
              !routeError &&
              !hasData && (
                <Center py="xl" role="status" aria-live="polite" aria-atomic="true">
                  <Text c="dimmed">No trains found for this direction right now.</Text>
                </Center>
              )}
          </Stack>
        </Box>

        <Text size="sm" c="dimmed" ta="center">
          Data: Digitraffic / Fintraffic – Weekdays only | v{getAppVersion()}
        </Text>
      </Stack>
    </Container>
  );
}
