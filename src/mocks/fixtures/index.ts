export { graphqlRouteResponse } from "./graphql-route-response";
export {
  train1719Response,
  train9700Response,
  trainResponses,
} from "./train-responses";

/** The base date used in all fixtures. */
const FIXTURE_DATE = "2026-01-27";

/**
 * Deep-clone a train REST fixture and replace the base date with a new one.
 * Updates departureDate and all scheduledTime/actualTime fields.
 */
export function withDate<T>(fixture: T, date: string): T {
  const json = JSON.stringify(fixture);
  return JSON.parse(json.split(FIXTURE_DATE).join(date)) as T;
}
