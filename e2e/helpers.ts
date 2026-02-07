import { Page } from "@playwright/test";
import {
  graphqlRouteResponse,
  trainResponses,
  withDate,
} from "../src/mocks/fixtures";

const GRAPHQL_URL = "**/api/v2/graphql/graphql";
const REST_URL = "**/api/v1/trains/**";

/** Mock the GraphQL route fetch with a successful response. */
export async function mockGraphQLRoute(page: Page, delay = 0) {
  const body = JSON.stringify(graphqlRouteResponse);
  await page.route(GRAPHQL_URL, async (route) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
}

/** Mock the GraphQL route fetch with an error response. */
export async function mockGraphQLError(page: Page, statusCode = 500) {
  await page.route(GRAPHQL_URL, async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });
}

/** Mock REST train API for a specific date and train number. */
export async function mockTrainApi(
  page: Page,
  date: string,
  trainNumber: number,
  delay = 0
) {
  const fixture = trainResponses[String(trainNumber)];
  if (!fixture) throw new Error(`No fixture for train ${trainNumber}`);
  const body = JSON.stringify(withDate(fixture, date));

  await page.route(`**/api/v1/trains/${date}/${trainNumber}`, async (route) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
}

/** Mock all REST train API calls with an error. */
export async function mockTrainApiError(page: Page, statusCode = 500) {
  await page.route(REST_URL, async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });
}

/** Mock all REST train API calls with a delayed successful response. */
export async function mockAllTrainApis(page: Page, date: string, delay = 0) {
  await mockTrainApi(page, date, 1719, delay);
  await mockTrainApi(page, date, 9700, delay);
}

/** Clear localStorage to ensure test isolation. */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/** Get a past weekday date string (YYYY-MM-DD) suitable for deterministic tests. */
export function getTestDate(): string {
  return "2026-01-27"; // A known past Tuesday
}
