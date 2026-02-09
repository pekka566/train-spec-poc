import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchLiveStationTrains,
  parseLiveTrains,
  selectVisibleTrains,
} from "@/utils/apiLive";
import { STATION_CODES } from "@/constants/stations";
import type { TravelDirection, LiveTrainInfo } from "@/types/live";

const STALE_TIME = 30_000;

export interface UseLiveTrainDataResult {
  previous: LiveTrainInfo[];
  next: LiveTrainInfo[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isFetched: boolean;
  refetch: () => void;
}

export function useLiveTrainData(
  direction: TravelDirection,
  routeTrainNumbers: number[],
  _enabled: boolean,
  minutesBeforeDeparture: number = 120,
  minutesAfterDeparture: number = 360
): UseLiveTrainDataResult {
  const stationCode =
    direction === "to-tampere" ? STATION_CODES.LEMPÄÄLÄ : STATION_CODES.TAMPERE;

  const routeSet = useMemo(() => new Set(routeTrainNumbers), [routeTrainNumbers]);

  const { data, isLoading, error, dataUpdatedAt, isFetched, refetch } = useQuery({
    queryKey: ["liveTrains", stationCode, direction],
    queryFn: async () => {
      const raw = await fetchLiveStationTrains(
        stationCode,
        minutesBeforeDeparture,
        minutesAfterDeparture
      );
      const parsed = parseLiveTrains(raw, direction, routeSet);
      const nowIso = new Date().toISOString();
      return selectVisibleTrains(parsed, nowIso);
    },
    enabled: false,
    staleTime: STALE_TIME,
    retry: 2,
  });

  return {
    previous: data?.previous ?? [],
    next: data?.next ?? [],
    isLoading,
    error: error as Error | null,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    isFetched,
    refetch,
  };
}
