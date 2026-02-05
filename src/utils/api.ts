import type { TrainResponse, TrainRecord, TrainStatus, TimeTableRow } from "@/types/train";
import { TRAINS } from "@/types/train";
import type { RouteDirection } from "@/utils/apiGraphql";

const API_BASE = "https://rata.digitraffic.fi/api/v1";

/**
 * Fetch train data from Digitraffic API
 * Returns the train data or null if not found
 * Throws on network errors or non-OK HTTP status
 */
export async function fetchTrain(
  date: string,
  trainNumber: number
): Promise<TrainResponse | null> {
  const url = `${API_BASE}/trains/${date}/${trainNumber}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] as TrainResponse;
}

/**
 * Get station codes for a train number (default 1719/9700).
 */
function getStationCodes(trainNumber: number): { from: string; to: string } {
  if (trainNumber === TRAINS.morning.number) {
    return { from: TRAINS.morning.from, to: TRAINS.morning.to };
  }
  return { from: TRAINS.evening.from, to: TRAINS.evening.to };
}

/**
 * Get station codes by route direction (for parsing any train on the route).
 */
export function getStationCodesByDirection(
  direction: RouteDirection
): { from: string; to: string } {
  if (direction === "Lempäälä → Tampere") {
    return { from: "LPÄ", to: "TPE" };
  }
  return { from: "TPE", to: "LPÄ" };
}

/**
 * Determine train status based on delay and cancelled flag.
 * Exported so cached records can be re-classified when status logic changes.
 */
export function getTrainStatus(cancelled: boolean, delayMinutes: number): TrainStatus {
  if (cancelled) return "CANCELLED";
  if (delayMinutes <= 1) return "ON_TIME";
  if (delayMinutes <= 5) return "SLIGHT_DELAY";
  return "DELAYED";
}

/**
 * Parse Digitraffic API response to TrainRecord with explicit from/to stations.
 * Use for arbitrary trains on a route (e.g. GraphQL trainsByDepartureDate).
 */
export function parseTrainResponseWithStations(
  response: TrainResponse,
  from: string,
  to: string
): TrainRecord | null {
  const departureRow = response.timeTableRows.find(
    (row: TimeTableRow) => row.type === "DEPARTURE" && row.stationShortCode === from
  );
  const arrivalRow = response.timeTableRows.find(
    (row: TimeTableRow) => row.type === "ARRIVAL" && row.stationShortCode === to
  );

  if (!departureRow || !arrivalRow) {
    return null;
  }

  const cancelled = response.cancelled || departureRow.cancelled;
  const delayMinutes = cancelled ? 0 : (departureRow.differenceInMinutes ?? 0);
  const status = getTrainStatus(cancelled, delayMinutes);

  return {
    date: response.departureDate,
    trainNumber: response.trainNumber,
    trainType: response.trainType,
    cancelled,
    scheduledDeparture: departureRow.scheduledTime,
    actualDeparture: cancelled ? null : (departureRow.actualTime ?? null),
    scheduledArrival: arrivalRow.scheduledTime,
    actualArrival: cancelled ? null : (arrivalRow.actualTime ?? null),
    delayMinutes,
    status,
  };
}

/**
 * Parse Digitraffic API response to TrainRecord (uses known train numbers for from/to).
 */
export function parseTrainResponse(response: TrainResponse): TrainRecord | null {
  const { from, to } = getStationCodes(response.trainNumber);
  return parseTrainResponseWithStations(response, from, to);
}
