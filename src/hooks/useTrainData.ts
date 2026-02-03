import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import type { TrainRecord } from "@/types/train";
import { fetchTrain, parseTrainResponse } from "@/utils/api";
import {
  getNeededApiCalls,
  getApiCallsNeeded,
  getCachedData,
  setTrainInStorage,
  getTrainFromStorage,
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
  fetchId: number;
}

/**
 * Hook for fetching and managing train data
 * Data is only fetched when fetch() is called
 */
export function useTrainData(
  startDate: string,
  endDate: string
): UseTrainDataResult {
  const queryClient = useQueryClient();
  const [fetchState, setFetchState] = useState<FetchState | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Calculate needed API calls
  const neededApiCalls = getNeededApiCalls(startDate, endDate);
  const tooManyApiCalls = neededApiCalls > MAX_API_CALLS;

  // Query to fetch all needed data
  const { data, isLoading, error } = useQuery({
    queryKey: ["trainData", fetchState?.startDate, fetchState?.endDate, fetchState?.fetchId],
    queryFn: async () => {
      if (!fetchState) return [];

      const apiCallsNeeded = getApiCallsNeeded(fetchState.startDate, fetchState.endDate);
      const results: TrainRecord[] = [];
      const errors: Array<{ date: string; trainNumber: number; error: Error }> = [];

      // Fetch all needed data
      await Promise.all(
        apiCallsNeeded.map(async ({ date, trainNumber }) => {
          try {
            // Check cache first for non-today dates
            if (!isToday(date)) {
              const cached = getTrainFromStorage(date, trainNumber);
              if (cached) {
                results.push(cached);
                return;
              }
            }

            // Fetch from API
            const response = await fetchTrain(date, trainNumber);
            if (response) {
              const record = parseTrainResponse(response);
              if (record) {
                results.push(record);
                // Store in local storage (won't store today's data)
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

      // Add cached data that wasn't in the API calls list
      const cachedData = getCachedData(fetchState.startDate, fetchState.endDate);
      for (const cached of cachedData) {
        const exists = results.some(
          (r) => r.date === cached.date && r.trainNumber === cached.trainNumber
        );
        if (!exists) {
          results.push(cached);
        }
      }

      // Sort by date (newest first)
      results.sort((a, b) => b.date.localeCompare(a.date));

      // Only throw if all requests failed
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
    // Always set hasFetched when user clicks Fetch, so error states can be shown
    setHasFetched(true);
    
    // Then check and return early if too many calls
    if (tooManyApiCalls) return;

    // Invalidate previous query and trigger new fetch
    queryClient.invalidateQueries({ queryKey: ["trainData"] });
    setFetchState({
      startDate,
      endDate,
      fetchId: Date.now(), // Unique ID to force refetch
    });
  }, [startDate, endDate, tooManyApiCalls, queryClient]);

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
