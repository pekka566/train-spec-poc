import type { TrainStatus } from "./train";

/** A single timeTableRow from the live-trains/station API with real-time fields. */
export interface LiveTimeTableRow {
  stationShortCode: string;
  stationUICCode: number;
  type: "DEPARTURE" | "ARRIVAL";
  trainStopping: boolean;
  commercialStop?: boolean;
  cancelled: boolean;
  scheduledTime: string;
  liveEstimateTime?: string;
  actualTime?: string;
  differenceInMinutes?: number;
  causes?: LiveDelayCause[];
  commercialTrack?: string;
}

export interface LiveDelayCause {
  categoryCodeId?: string;
  detailedCategoryCodeId?: string;
  thirdCategoryCodeId?: string;
}

/** Top-level train object from the live-trains/station API. */
export interface LiveTrainResponse {
  trainNumber: number;
  departureDate: string;
  trainType: string;
  trainCategory: string;
  commuterLineID?: string;
  runningCurrently: boolean;
  cancelled: boolean;
  timeTableRows: LiveTimeTableRow[];
}

/** Direction the user is traveling. */
export type TravelDirection = "to-tampere" | "to-lempäälä";

/** Phase of a train relative to current time. */
export type TrainPhase = "departed" | "upcoming";

/** Processed live train info for display. */
export interface LiveTrainInfo {
  trainNumber: number;
  trainType: string;
  cancelled: boolean;
  runningCurrently: boolean;
  departure: {
    stationCode: string;
    scheduledTime: string;
    estimatedTime: string | null;
    actualTime: string | null;
    delayMinutes: number;
  };
  arrival: {
    stationCode: string;
    scheduledTime: string;
    estimatedTime: string | null;
    actualTime: string | null;
    delayMinutes: number;
  };
  status: TrainStatus;
  phase: TrainPhase;
  /** Track at departure station (from API commercialTrack). */
  commercialTrack?: string;
}

/** Result of selecting visible trains for display: all departed (previous), all upcoming (next). */
export interface VisibleTrains {
  previous: LiveTrainInfo[];
  next: LiveTrainInfo[];
}
