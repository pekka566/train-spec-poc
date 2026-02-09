import type {
  LiveTrainResponse,
  LiveTrainInfo,
  TravelDirection,
  VisibleTrains,
} from "@/types/live";
import { getTrainStatus } from "./api";
import { STATION_CODES } from "@/constants/stations";

const API_BASE = "https://rata.digitraffic.fi/api/v1";

/**
 * Fetch live trains at a station from the Digitraffic API.
 * Uses time-window parameters to get recently departed + upcoming trains.
 */
export async function fetchLiveStationTrains(
  stationCode: string,
  minutesBefore: number = 120,
  minutesAfter: number = 360,
): Promise<LiveTrainResponse[]> {
  const url =
    `${API_BASE}/live-trains/station/${encodeURIComponent(stationCode)}` +
    `?minutes_before_departure=${minutesAfter}` +
    `&minutes_after_departure=${minutesBefore}` +
    `&minutes_before_arrival=0` +
    `&minutes_after_arrival=0` +
    `&train_categories=Commuter,Long-distance`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Live API error: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  return data as LiveTrainResponse[];
}

function getStationCodes(direction: TravelDirection): {
  from: string;
  to: string;
} {
  if (direction === "to-tampere") {
    return { from: STATION_CODES.LEMPÄÄLÄ, to: STATION_CODES.TAMPERE };
  }
  return { from: STATION_CODES.TAMPERE, to: STATION_CODES.LEMPÄÄLÄ };
}

/**
 * Parse and filter raw live train responses to LiveTrainInfo for a given direction.
 * Only includes trains whose numbers are in the known route set.
 */
export function parseLiveTrains(
  trains: LiveTrainResponse[],
  direction: TravelDirection,
  routeTrainNumbers: Set<number>,
): LiveTrainInfo[] {
  const { from, to } = getStationCodes(direction);
  const result: LiveTrainInfo[] = [];

  for (const train of trains) {
    if (!routeTrainNumbers.has(train.trainNumber)) continue;

    const depRow = train.timeTableRows.find(
      (r) => r.type === "DEPARTURE" && r.stationShortCode === from,
    );
    const arrRow = train.timeTableRows.find(
      (r) => r.type === "ARRIVAL" && r.stationShortCode === to,
    );

    if (!depRow || !arrRow) continue;

    const cancelled = train.cancelled || depRow.cancelled;
    const depDelay = cancelled ? 0 : (depRow.differenceInMinutes ?? 0);
    const arrDelay = cancelled ? 0 : (arrRow.differenceInMinutes ?? 0);
    const status = getTrainStatus(cancelled, depDelay);
    const phase = depRow.actualTime ? "departed" : "upcoming";
    const track =
      depRow.commercialTrack?.trim() !== ""
        ? depRow.commercialTrack
        : undefined;

    result.push({
      trainNumber: train.trainNumber,
      trainType: train.trainType,
      cancelled,
      runningCurrently: train.runningCurrently,
      departure: {
        stationCode: from,
        scheduledTime: depRow.scheduledTime,
        estimatedTime: depRow.liveEstimateTime ?? null,
        actualTime: depRow.actualTime ?? null,
        delayMinutes: depDelay,
      },
      arrival: {
        stationCode: to,
        scheduledTime: arrRow.scheduledTime,
        estimatedTime: arrRow.liveEstimateTime ?? null,
        actualTime: arrRow.actualTime ?? null,
        delayMinutes: arrDelay,
      },
      status,
      phase,
      commercialTrack: track,
    });
  }

  result.sort((a, b) =>
    a.departure.scheduledTime.localeCompare(b.departure.scheduledTime),
  );

  return result;
}

/**
 * Select visible trains for display: all departed (previous) and all upcoming (next).
 */
export function selectVisibleTrains(
  trains: LiveTrainInfo[],
  nowIso: string,
): VisibleTrains {
  const departed: LiveTrainInfo[] = [];
  const upcoming: LiveTrainInfo[] = [];

  for (const train of trains) {
    if (train.departure.scheduledTime <= nowIso) {
      departed.push(train);
    } else {
      upcoming.push(train);
    }
  }

  return { previous: departed, next: upcoming };
}
