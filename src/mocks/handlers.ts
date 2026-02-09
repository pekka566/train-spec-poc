import { http, HttpResponse } from "msw";
import {
  graphqlRouteResponse,
  trainResponses,
  withDate,
  liveStationLPÄResponse,
  liveStationTPEResponse,
} from "./fixtures";

const GRAPHQL_URL = "https://rata.digitraffic.fi/api/v2/graphql/graphql";
const REST_URL = "https://rata.digitraffic.fi/api/v1/trains/:date/:trainNumber";
const LIVE_STATION_URL =
  "https://rata.digitraffic.fi/api/v1/live-trains/station/:stationCode";

/** Default handlers that return successful mock responses. */
export const handlers = [
  // GraphQL route fetch
  http.post(GRAPHQL_URL, () => {
    return HttpResponse.json(graphqlRouteResponse);
  }),

  // REST train fetch (dynamic date + trainNumber)
  http.get(REST_URL, ({ params }) => {
    const trainNumber = params.trainNumber as string;
    const date = params.date as string;
    const fixture = trainResponses[trainNumber];
    if (!fixture) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(withDate(fixture, date));
  }),

  // Live trains at station
  http.get(LIVE_STATION_URL, ({ params }) => {
    const stationCode = decodeURIComponent(params.stationCode as string);
    if (stationCode === "LPÄ") {
      return HttpResponse.json(liveStationLPÄResponse);
    }
    if (stationCode === "TPE") {
      return HttpResponse.json(liveStationTPEResponse);
    }
    return HttpResponse.json([]);
  }),
];

/** Error handler overrides for use with server.use() in tests. */
export const errorHandlers = {
  /** GraphQL route fetch returns 500. */
  graphql500: http.post(GRAPHQL_URL, () => {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }),

  /** GraphQL route fetch returns a response with errors array. */
  graphqlWithErrors: http.post(GRAPHQL_URL, () => {
    return HttpResponse.json({
      errors: [{ message: "Server error" }],
    });
  }),

  /** REST train fetch returns 500 for all trains. */
  restError: http.get(REST_URL, () => {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }),

  /** Live station API returns 500. */
  liveStation500: http.get(LIVE_STATION_URL, () => {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }),
};
