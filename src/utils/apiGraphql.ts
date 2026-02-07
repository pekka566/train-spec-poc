import { getTodayFinnish, getReferenceWeekdayDate } from "./dateUtils";
import { cleanupOldStorage } from "./trainStorage";
import { STATION_NAMES } from "@/constants/stations";

/** Digitraffic GraphQL v2 POST endpoint (per FI docs: /api/v2/graphql/graphql). */
const GRAPHQL_URL = "https://rata.digitraffic.fi/api/v2/graphql/graphql";

/** Station names used for filtering (Digitraffic: Tampere asema). */
const STATION_LEMPÄÄLÄ = STATION_NAMES.LEMPÄÄLÄ;
const STATION_TAMPERE = STATION_NAMES.TAMPERE;

/**
 * Train types to include: Commuter (HL, HV, HLV) and Long-distance (H, PVS, P, HDM, PVV, S, V, IC2, IC, HSM, AE, PYO, MV, MUS).
 * Source: https://rata.digitraffic.fi/api/v1/metadata/train-types (categories "Commuter" and "Long-distance").
 */
const ALLOWED_TRAIN_TYPES = [
  "HL",
  "HV",
  "HLV",
  "H",
  "PVS",
  "P",
  "HDM",
  "PVV",
  "S",
  "V",
  "IC2",
  "IC",
  "HSM",
  "AE",
  "PYO",
  "MV",
  "MUS",
];

/** Direction on the Lempäälä–Tampere route. */
export type RouteDirection = "Lempäälä → Tampere" | "Tampere → Lempäälä";

/** Minimal stored data per train for today's route (both directions). */
export interface RouteTrainInfo {
  trainNumber: number;
  stationName: string;
  scheduledDeparture: string;
  direction: RouteDirection;
}

/** GraphQL timeTableRow shape (minimal: type, scheduledTime, station name, trainStopping). */
interface GraphQLTimeTableRow {
  type: string;
  scheduledTime: string;
  station?: { name: string } | null;
  trainStopping?: boolean;
}

/** GraphQL train node shape (minimal query). trainType is object with name (TrainType! in schema). */
interface GraphQLTrain {
  trainNumber: number;
  trainType?: { name: string } | null;
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

/** Build minimal query: single query filtered by Lempäälä, request trainNumber, trainType.name, timeTableRows for Lempäälä/Tampere. */
export function buildRouteQuery(date: string): string {
  return `query RouteToday {
  trainsByDepartureDate(
    departureDate: "${date}",
    where: { timeTableRows: { contains: { station: { name: { equals: "${STATION_LEMPÄÄLÄ}" } } } } },
    orderBy: { trainNumber: ASCENDING }
  ) {
    trainNumber
    trainType { name }
    timeTableRows(${TIME_TABLE_ROWS_WHERE}) {
      type
      scheduledTime
      station { name }
      trainStopping
    }
  }
}`;
}

/**
 * Fetch trains for Lempäälä–Tampere route for a given date via GraphQL v2 (single query).
 * Returns only trains that stop at Lempäälä (trainStopping === true at Lempäälä). Direction is derived from which departure (Lempäälä or Tampere) is earlier.
 * Use a weekday date to get weekday-only trains (app shows only weekday trains).
 */
export async function fetchRouteTodayGraphQL(
  date?: string
): Promise<RouteTrainInfo[]> {
  const queryDate = date ?? getReferenceWeekdayDate();
  const query = buildRouteQuery(queryDate);

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

  const rawTrains = json.data?.trainsByDepartureDate ?? [];
  const trains = rawTrains.filter(
    (t) => t.trainType?.name != null && ALLOWED_TRAIN_TYPES.includes(t.trainType.name)
  );
  const result: RouteTrainInfo[] = [];

  for (const g of trains) {
    const rows = g.timeTableRows ?? [];
    const stopsAtLempäälä = rows.some(
      (r) => r.station?.name === STATION_LEMPÄÄLÄ && r.trainStopping === true
    );
    if (!stopsAtLempäälä) continue;

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

const ROUTE_WEEKDAY_STORAGE_KEY = "train:route:weekday";

/**
 * Read today's route data from localStorage.
 * Returns null if missing or invalid. Use date (YYYY-MM-DD) for the key train:route:today:{date}.
 */
export function getRouteTodayFromStorage(date: string): RouteTodayStorage | null {
  const raw = localStorage.getItem(`train:route:today:${date}`);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as RouteTodayStorage;
    if (!payload?.date || !Array.isArray(payload.trains)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Read weekday route data from localStorage (trains that run on weekdays only).
 * Returns null if missing or invalid. Key: train:route:weekday.
 */
export function getRouteWeekdayFromStorage(): RouteTodayStorage | null {
  const raw = localStorage.getItem(ROUTE_WEEKDAY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as RouteTodayStorage;
    if (!payload?.date || !Array.isArray(payload.trains)) return null;
    return payload;
  } catch {
    return null;
  }
}

const OUTBOUND_DIRECTION: RouteDirection = "Lempäälä → Tampere";
const RETURN_DIRECTION: RouteDirection = "Tampere → Lempäälä";

/**
 * Split route trains by direction and sort by scheduledDeparture (ascending).
 * Outbound = Lempäälä → Tampere, return = Tampere → Lempäälä.
 */
export function getRouteTrainsByDirection(
  trains: RouteTrainInfo[]
): {
  outbound: RouteTrainInfo[];
  return: RouteTrainInfo[];
} {
  const byDep = (a: RouteTrainInfo, b: RouteTrainInfo) =>
    a.scheduledDeparture.localeCompare(b.scheduledDeparture);
  const outbound = trains
    .filter((t) => t.direction === OUTBOUND_DIRECTION)
    .sort(byDep);
  const returnTrains = trains
    .filter((t) => t.direction === RETURN_DIRECTION)
    .sort(byDep);
  return { outbound, return: returnTrains };
}

/**
 * Filter return trains to those departing after the selected outbound (same-day comparison by scheduledDeparture).
 */
export function filterReturnOptions(
  returnTrains: RouteTrainInfo[],
  selectedOutboundDeparture: string
): RouteTrainInfo[] {
  return returnTrains.filter(
    (t) => t.scheduledDeparture > selectedOutboundDeparture
  );
}

/**
 * Run one-time route fetch for weekday trains: fetch via GraphQL v2 for a reference weekday and save to localStorage.
 * Idempotent per day (train:route:fetched flag). Uses getReferenceWeekdayDate() so the list contains only weekday trains.
 * Stores under train:route:weekday so the dropdown shows weekday trains every day (including weekends).
 */
export async function runRouteFetchOnce(): Promise<void> {
  const today = getTodayFinnish();
  const flagKey = "train:route:fetched";
  const stored = localStorage.getItem(flagKey);
  if (stored === today) {
    return;
  }

  try {
    const refDate = getReferenceWeekdayDate();
    const trains = await fetchRouteTodayGraphQL(refDate);
    const payload: RouteTodayStorage = { date: refDate, trains };

    localStorage.setItem(ROUTE_WEEKDAY_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(flagKey, today);
    cleanupOldStorage();
  } catch (err) {
    console.warn("Route fetch failed:", err);
    throw err;
  }
}
