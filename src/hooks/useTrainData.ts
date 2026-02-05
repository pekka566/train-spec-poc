import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import type { TrainRecord } from "@/types/train";
import {
  fetchTrain,
  parseTrainResponseWithStations,
  getStationCodesByDirection,
} from "@/utils/api";
import type { RouteDirection } from "@/utils/apiGraphql";
import {
  getNeededApiCalls,
  getApiCallsNeeded,
  getCachedData,
  setTrainInStorage,
  getTrainFromStorage,
  type TrainNumbers,
} from "@/utils/trainStorage";
import { isToday } from "@/utils/dateUtils";

const MAX_API_CALLS = 30;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export interface UseTrainDataResult {
  data: TrainRecord[];
  isLoading: boolean;
  error: Error | null;
  tooManyApiCalls: boolean;
  neededApiCalls: number;
  fetch: () => void;
  hasFetched: boolean;
}

interface FetchState {
  startDate: string;
  endDate: string;
  trainNumbers: TrainNumbers;
  fetchId: number;
}

const OUTBOUND_DIR: RouteDirection = "Lempäälä → Tampere";
const RETURN_DIR: RouteDirection = "Tampere → Lempäälä";

/**
 * Hook for fetching and managing train data.
 * Data is only fetched when fetch() is called.
 * Uses the two selected train numbers (outbound, return) for all API and cache operations.
 */
export function useTrainData(
  startDate: string,
  endDate: string,
  trainNumbers: TrainNumbers
): UseTrainDataResult {
  const queryClient = useQueryClient();
  const [fetchState, setFetchState] = useState<FetchState | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const neededApiCalls = getNeededApiCalls(startDate, endDate, trainNumbers);
  const tooManyApiCalls = neededApiCalls > MAX_API_CALLS;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "trainData",
      fetchState?.startDate,
      fetchState?.endDate,
      fetchState?.trainNumbers,
      fetchState?.fetchId,
    ],
    queryFn: async () => {
      if (!fetchState) return [];

      const apiCallsNeeded = getApiCallsNeeded(
        fetchState.startDate,
        fetchState.endDate,
        fetchState.trainNumbers
      );
      const results: TrainRecord[] = [];
      const errors: Array<{ date: string; trainNumber: number; error: Error }> = [];
      const [outboundNum] = fetchState.trainNumbers;

      await Promise.all(
        apiCallsNeeded.map(async ({ date, trainNumber }) => {
          try {
            if (!isToday(date)) {
              const cached = getTrainFromStorage(date, trainNumber);
              if (cached) {
                results.push(cached);
                return;
              }
            }

            const response = await fetchTrain(date, trainNumber);
            if (response) {
              const direction =
                trainNumber === outboundNum ? OUTBOUND_DIR : RETURN_DIR;
              const { from, to } = getStationCodesByDirection(direction);
              const record = parseTrainResponseWithStations(
                response,
                from,
                to
              );
              if (record) {
                results.push(record);
                setTrainInStorage(date, trainNumber, record);
              }
            }
          } catch (err) {
            errors.push({
              date,
              trainNumber,
              error: err instanceof Error ? err : new Error(String(err)),
            });
          }
        })
      );

      const cachedData = getCachedData(
        fetchState.startDate,
        fetchState.endDate,
        fetchState.trainNumbers
      );
      for (const cached of cachedData) {
        const exists = results.some(
          (r) =>
            r.date === cached.date && r.trainNumber === cached.trainNumber
        );
        if (!exists) {
          results.push(cached);
        }
      }

      results.sort((a, b) => b.date.localeCompare(a.date));

      if (errors.length > 0 && results.length === 0) {
        throw new Error("Failed to fetch train data. Please try again.");
      }

      return results;
    },
    enabled: fetchState !== null && !tooManyApiCalls,
    staleTime: STALE_TIME,
    retry: 1,
  });

  const fetch = useCallback(() => {
    setHasFetched(true);
    if (tooManyApiCalls) return;

    queryClient.invalidateQueries({ queryKey: ["trainData"] });
    setFetchState({
      startDate,
      endDate,
      trainNumbers,
      fetchId: Date.now(),
    });
  }, [startDate, endDate, trainNumbers, tooManyApiCalls, queryClient]);

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    tooManyApiCalls,
    neededApiCalls,
    fetch,
    hasFetched,
  };
}
