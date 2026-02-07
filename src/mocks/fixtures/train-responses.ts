/** Mock REST API responses for individual train fetches. */

export const train1719Response = [
  {
    trainNumber: 1719,
    departureDate: "2026-01-27",
    trainType: "HL",
    operatorShortCode: "vr",
    runningCurrently: false,
    cancelled: false,
    timeTableRows: [
      {
        stationShortCode: "LPÄ",
        type: "DEPARTURE",
        scheduledTime: "2026-01-27T06:20:00Z",
        actualTime: "2026-01-27T06:22:00Z",
        differenceInMinutes: 2,
        commercialStop: true,
        cancelled: false,
      },
      {
        stationShortCode: "TPE",
        type: "ARRIVAL",
        scheduledTime: "2026-01-27T06:40:00Z",
        actualTime: "2026-01-27T06:42:00Z",
        differenceInMinutes: 2,
        commercialStop: true,
        cancelled: false,
      },
    ],
  },
];

export const train9700Response = [
  {
    trainNumber: 9700,
    departureDate: "2026-01-27",
    trainType: "HL",
    operatorShortCode: "vr",
    runningCurrently: false,
    cancelled: false,
    timeTableRows: [
      {
        stationShortCode: "TPE",
        type: "DEPARTURE",
        scheduledTime: "2026-01-27T14:35:00Z",
        actualTime: "2026-01-27T14:35:00Z",
        differenceInMinutes: 0,
        commercialStop: true,
        cancelled: false,
      },
      {
        stationShortCode: "LPÄ",
        type: "ARRIVAL",
        scheduledTime: "2026-01-27T14:55:00Z",
        actualTime: "2026-01-27T14:55:00Z",
        differenceInMinutes: 0,
        commercialStop: true,
        cancelled: false,
      },
    ],
  },
];

/** Map of train number to fixture response. */
export const trainResponses: Record<string, typeof train1719Response> = {
  "1719": train1719Response,
  "9700": train9700Response,
};
