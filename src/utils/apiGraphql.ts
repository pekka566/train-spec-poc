import { getTodayFinnish } from "./dateUtils";

/** Digitraffic GraphQL v2 POST endpoint (per FI docs: /api/v2/graphql/graphql). */
const GRAPHQL_URL = "https://rata.digitraffic.fi/api/v2/graphql/graphql";

/** Station names used for filtering (Digitraffic: Tampere asema). */
const STATION_LEMPÄÄLÄ = "Lempäälä";
const STATION_TAMPERE = "Tampere asema";

/** Direction on the Lempäälä–Tampere route. */
export type RouteDirection = "Lempäälä → Tampere" | "Tampere → Lempäälä";

/** Minimal stored data per train for today's route (both directions). */
export interface RouteTrainInfo {
  trainNumber: number;
  stationName: string;
  scheduledDeparture: string;
  direction: RouteDirection;
}

/** GraphQL timeTableRow shape (minimal: type, scheduledTime, station name only). */
interface GraphQLTimeTableRow {
  type: string;
  scheduledTime: string;
  station?: { name: string } | null;
}

/** GraphQL train node shape (minimal query). */
interface GraphQLTrain {
  trainNumber: number;
  timeTableRows?: GraphQLTimeTableRow[] | null;
}

/** timeTableRows filter: only Lempäälä and Tampere asema (reduces response size). */
const TIME_TABLE_ROWS_WHERE = `where: { or: [{ station: { name: { equals: "${STATION_LEMPÄÄLÄ}" } } }, { station: { name: { equals: "${STATION_TAMPERE}" } } }] }`;

/**
 * Derive departure station and direction from timeTableRows.
 * Compares DEPARTURE times at Lempäälä and Tampere asema; the earlier one is the train's departure on this route.
 */
function getDepartureAndDirection(
  rows: GraphQLTimeTableRow[]
): { stationName: string; scheduledDeparture: string; direction: RouteDirection } | null {
  const depL = rows.find((r) => r.type === "DEPARTURE" && r.station?.name === STATION_LEMPÄÄLÄ);
  const depT = rows.find((r) => r.type === "DEPARTURE" && r.station?.name === STATION_TAMPERE);

  if (depL && depT) {
    const earlier = depL.scheduledTime <= depT.scheduledTime ? depL : depT;
    const direction: RouteDirection =
      earlier === depL ? "Lempäälä → Tampere" : "Tampere → Lempäälä";
    const stationName = earlier === depL ? STATION_LEMPÄÄLÄ : STATION_TAMPERE;
    return { stationName, scheduledDeparture: earlier.scheduledTime, direction };
  }
  if (depL) {
    return {
      stationName: STATION_LEMPÄÄLÄ,
      scheduledDeparture: depL.scheduledTime,
      direction: "Lempäälä → Tampere",
    };
  }
  if (depT) {
    return {
      stationName: STATION_TAMPERE,
      scheduledDeparture: depT.scheduledTime,
      direction: "Tampere → Lempäälä",
    };
  }
  return null;
}

/** Build minimal query: single query filtered by Lempäälä, request trainNumber + timeTableRows for Lempäälä/Tampere. */
function buildRouteQuery(date: string): string {
  return `query RouteToday {
  trainsByDepartureDate(
    departureDate: "${date}",
    where: { timeTableRows: { contains: { station: { name: { equals: "${STATION_LEMPÄÄLÄ}" } } } } },
    orderBy: { trainNumber: ASCENDING }
  ) {
    trainNumber
    timeTableRows(${TIME_TABLE_ROWS_WHERE}) {
      type
      scheduledTime
      station { name }
    }
  }
}`;
}

/**
 * Fetch trains for Lempäälä–Tampere route for today via GraphQL v2 (single query).
 * Returns all trains that pass through Lempäälä (both directions). Direction is derived from which departure (Lempäälä or Tampere) is earlier.
 */
export async function fetchRouteTodayGraphQL(): Promise<RouteTrainInfo[]> {
  const date = getTodayFinnish();
  const query = buildRouteQuery(date);

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL error: ${res.status} ${res.statusText}`);
  }

  const json: {
    data?: { trainsByDepartureDate?: GraphQLTrain[] | null };
    errors?: Array<{ message: string }>;
  } = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  const trains = json.data?.trainsByDepartureDate ?? [];
  const result: RouteTrainInfo[] = [];

  for (const g of trains) {
    const rows = g.timeTableRows ?? [];
    const info = getDepartureAndDirection(rows);
    if (!info) continue;

    result.push({
      trainNumber: g.trainNumber,
      stationName: info.stationName,
      scheduledDeparture: info.scheduledDeparture,
      direction: info.direction,
    });
  }

  result.sort((a, b) => a.trainNumber - b.trainNumber);
  return result;
}

/** localStorage value shape for today's route. */
export interface RouteTodayStorage {
  date: string;
  trains: RouteTrainInfo[];
}

/**
 * Run one-time route fetch for today: fetch via GraphQL v2 and save to localStorage.
 * Idempotent per day (train:route:fetched flag). Stores all trains from the single query (both directions).
 */
export async function runRouteFetchOnce(): Promise<void> {
  const today = getTodayFinnish();
  const flagKey = "train:route:fetched";
  const stored = localStorage.getItem(flagKey);
  if (stored === today) {
    return;
  }

  try {
    const trains = await fetchRouteTodayGraphQL();
    const payload: RouteTodayStorage = { date: today, trains };

    localStorage.setItem(`train:route:today:${today}`, JSON.stringify(payload));
    localStorage.setItem(flagKey, today);
  } catch {
    // Silent: no UI, no throw
  }
}
