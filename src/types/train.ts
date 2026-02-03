export type TrainStatus = "ON_TIME" | "SLIGHT_DELAY" | "DELAYED" | "CANCELLED";

export interface TrainRecord {
  date: string; // "YYYY-MM-DD"
  trainNumber: number;
  trainType: string;
  cancelled: boolean;
  scheduledDeparture: string; // ISO timestamp
  actualDeparture: string | null;
  scheduledArrival: string;
  actualArrival: string | null;
  delayMinutes: number;
  status: TrainStatus;
}

export interface TimeTableRow {
  stationShortCode: string;
  type: "DEPARTURE" | "ARRIVAL";
  scheduledTime: string; // ISO 8601 UTC
  actualTime?: string;
  differenceInMinutes?: number; // positive = late
  commercialStop: boolean;
  cancelled: boolean;
}

export interface TrainResponse {
  trainNumber: number;
  departureDate: string; // "YYYY-MM-DD"
  trainType: string;
  operatorShortCode: string;
  runningCurrently: boolean;
  cancelled: boolean;
  timeTableRows: TimeTableRow[];
}

export interface TrainConfig {
  number: number;
  name: string;
  from: string;
  to: string;
  scheduledTime: string;
  direction: string;
}

export const TRAINS: { morning: TrainConfig; evening: TrainConfig } = {
  morning: {
    number: 1719,
    name: "Morning train",
    from: "LPÄ",
    to: "TPE",
    scheduledTime: "8:20",
    direction: "Lempäälä → Tampere",
  },
  evening: {
    number: 9700,
    name: "Evening train",
    from: "TPE",
    to: "LPÄ",
    scheduledTime: "16:35",
    direction: "Tampere → Lempäälä",
  },
};

export const TRAIN_NUMBERS = [TRAINS.morning.number, TRAINS.evening.number] as const;

export interface TrainSummary {
  onTimePercent: number;
  slightDelayPercent: number;
  delayedPercent: number;
  cancelledCount: number;
  averageDelay: number;
  totalCount: number;
  onTimeCount: number;
  slightDelayCount: number;
  delayedCount: number;
}
