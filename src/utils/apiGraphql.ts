import type { TrainRecord } from "@/types/train";
import { parseTrainResponseWithStations } from "./api";
import { getTodayFinnish } from "./dateUtils";
import type { TimeTableRow } from "@/types/train";
import type { TrainResponse } from "@/types/train";

/** Digitraffic GraphQL v2 POST endpoint (per FI docs: /api/v2/graphql/graphql). */
const GRAPHQL_URL = "https://rata.digitraffic.fi/api/v2/graphql/graphql";

const LPÄ = "LPÄ";
const TPE = "TPE";

/** GraphQL timeTableRow shape (station as object) */
interface GraphQLTimeTableRow {
  type: string;
  scheduledTime: string;
  actualTime?: string | null;
  differenceInMinutes?: number | null;
  station?: { shortCode: string } | null;
  cancelled?: boolean;
}

/** GraphQL train node shape (trainType is object TrainType! with name). */
interface GraphQLTrain {
  trainNumber: number;
  departureDate: string;
  trainType: { name: string };
  cancelled: boolean;
  timeTableRows?: GraphQLTimeTableRow[] | null;
}

function mapGraphQLRow(row: GraphQLTimeTableRow): TimeTableRow {
  return {
    stationShortCode: row.station?.shortCode ?? "",
    type: row.type as "DEPARTURE" | "ARRIVAL",
    scheduledTime: row.scheduledTime,
    actualTime: row.actualTime ?? undefined,
    differenceInMinutes: row.differenceInMinutes ?? undefined,
    commercialStop: false,
    cancelled: row.cancelled ?? false,
  };
}

function graphQLTrainToResponse(g: GraphQLTrain): TrainResponse {
  return {
    trainNumber: g.trainNumber,
    departureDate: g.departureDate,
    trainType: g.trainType?.name ?? "",
    operatorShortCode: "",
    runningCurrently: false,
    cancelled: g.cancelled,
    timeTableRows: (g.timeTableRows ?? []).map(mapGraphQLRow),
  };
}

/** Determine from/to for a train between LPÄ and TPE from its timeTableRows. */
function getDirectionFromTo(rows: TimeTableRow[]): { from: string; to: string } | null {
  const depLPÄ = rows.find((r) => r.type === "DEPARTURE" && r.stationShortCode === LPÄ);
  const arrTPE = rows.find((r) => r.type === "ARRIVAL" && r.stationShortCode === TPE);
  const depTPE = rows.find((r) => r.type === "DEPARTURE" && r.stationShortCode === TPE);
  const arrLPÄ = rows.find((r) => r.type === "ARRIVAL" && r.stationShortCode === LPÄ);

  if (depLPÄ && arrTPE) return { from: LPÄ, to: TPE };
  if (depTPE && arrLPÄ) return { from: TPE, to: LPÄ };
  return null;
}

/** True if train has both LPÄ and TPE in its timeTableRows (route Lempäälä ↔ Tampere). */
function isTrainOnRoute(rows: TimeTableRow[]): boolean {
  const stations = new Set(rows.map((r) => r.stationShortCode));
  return stations.has(LPÄ) && stations.has(TPE);
}

/**
 * Fetch all trains for Lempäälä ↔ Tampere route for today via GraphQL v2.
 * Uses trainsByDepartureDate with filter: trains that pass through LPÄ, then keeps only those that also have TPE.
 */
export async function fetchRouteTodayGraphQL(): Promise<TrainRecord[]> {
  const date = getTodayFinnish();
  // Inline date in query (no variables) so request matches working curl; API can return 400 when using variables.
  const query = `query RouteToday {
  trainsByDepartureDate(
    departureDate: "${date}",
    where: { timeTableRows: { contains: { station: { shortCode: { equals: "LPÄ" } } } } },
    orderBy: { trainNumber: ASCENDING }
  ) {
    trainNumber
    departureDate
    trainType { name }
    cancelled
    timeTableRows {
      type
      scheduledTime
      actualTime
      differenceInMinutes
      cancelled
      station { shortCode }
    }
  }
}`;

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
  const records: TrainRecord[] = [];

  for (const g of trains) {
    const response = graphQLTrainToResponse(g);
    if (!isTrainOnRoute(response.timeTableRows)) continue;

    const dir = getDirectionFromTo(response.timeTableRows);
    if (!dir) continue;

    const record = parseTrainResponseWithStations(response, dir.from, dir.to);
    if (record) records.push(record);
  }

  return records;
}

/**
 * Run one-time route fetch for today: fetch via GraphQL v2 and save train numbers + full data to localStorage.
 * Idempotent per day (uses a "fetched today" flag so it only runs once per day).
 */
export async function runRouteFetchOnce(): Promise<void> {
  const today = getTodayFinnish();
  const flagKey = "train:route:fetched";
  const stored = localStorage.getItem(flagKey);
  if (stored === today) {
    return;
  }

  try {
    const records = await fetchRouteTodayGraphQL();
    const numbers = records.map((r) => r.trainNumber);

    localStorage.setItem("train:route:numbers", JSON.stringify(numbers));
    localStorage.setItem(
      `train:route:today:${today}`,
      JSON.stringify(records)
    );
    localStorage.setItem(flagKey, today);
  } catch {
    // Silent: no UI, no throw
  }
}
