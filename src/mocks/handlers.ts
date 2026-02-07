import { http, HttpResponse } from "msw";
import { graphqlRouteResponse, trainResponses, withDate } from "./fixtures";

const GRAPHQL_URL = "https://rata.digitraffic.fi/api/v2/graphql/graphql";
const REST_URL = "https://rata.digitraffic.fi/api/v1/trains/:date/:trainNumber";

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
];

/** Error handler overrides for use with server.use() in tests. */
export const errorHandlers = {
  /** GraphQL route fetch returns 500. */
  graphql500: http.post(GRAPHQL_URL, () => {
    return HttpResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }),

  /** GraphQL route fetch returns a response with errors array. */
  graphqlWithErrors: http.post(GRAPHQL_URL, () => {
    return HttpResponse.json({
      errors: [{ message: "Server error" }],
    });
  }),

  /** REST train fetch returns 500 for all trains. */
  restError: http.get(REST_URL, () => {
    return HttpResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }),
};
