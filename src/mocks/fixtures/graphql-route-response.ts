/** Mock GraphQL route response for Lempäälä–Tampere trains (weekday). */
export const graphqlRouteResponse = {
  data: {
    trainsByDepartureDate: [
      {
        trainNumber: 1719,
        trainType: { name: "HL" },
        timeTableRows: [
          {
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T06:20:00Z",
            station: { name: "Lempäälä" },
            trainStopping: true,
          },
          {
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T06:40:00Z",
            station: { name: "Tampere asema" },
            trainStopping: true,
          },
        ],
      },
      {
        trainNumber: 1721,
        trainType: { name: "HL" },
        timeTableRows: [
          {
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T07:20:00Z",
            station: { name: "Lempäälä" },
            trainStopping: true,
          },
          {
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T07:40:00Z",
            station: { name: "Tampere asema" },
            trainStopping: true,
          },
        ],
      },
      {
        trainNumber: 9700,
        trainType: { name: "HL" },
        timeTableRows: [
          {
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T14:35:00Z",
            station: { name: "Tampere asema" },
            trainStopping: true,
          },
          {
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T14:55:00Z",
            station: { name: "Lempäälä" },
            trainStopping: true,
          },
        ],
      },
      {
        trainNumber: 9702,
        trainType: { name: "HL" },
        timeTableRows: [
          {
            type: "DEPARTURE",
            scheduledTime: "2026-01-27T15:35:00Z",
            station: { name: "Tampere asema" },
            trainStopping: true,
          },
          {
            type: "ARRIVAL",
            scheduledTime: "2026-01-27T15:55:00Z",
            station: { name: "Lempäälä" },
            trainStopping: true,
          },
        ],
      },
    ],
  },
};
