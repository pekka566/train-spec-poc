import { test, expect } from "@playwright/test";
import {
  mockGraphQLRoute,
  mockGraphQLError,
  clearLocalStorage,
} from "./helpers";
import { graphqlRouteResponse } from "../src/mocks/fixtures";

test.describe("App load and route fetch", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage for test isolation
    await page.goto("/");
    await clearLocalStorage(page);
  });

  test("shows title and initial state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Commute Punctuality" })).toBeVisible();
    await expect(page.getByText("Lempäälä - Tampere")).toBeVisible();
    await expect(page.getByText("Data: Digitraffic / Fintraffic - Weekdays only")).toBeVisible();
  });

  test("shows loading spinner during route fetch", async ({ page }) => {
    // Mock GraphQL with delay so we can see the spinner
    await mockGraphQLRoute(page, 3000);
    await page.goto("/");

    await expect(page.getByText("Loading train routes...")).toBeVisible();
  });

  test("shows error alert when route fetch fails", async ({ page }) => {
    await mockGraphQLError(page, 500);
    await page.goto("/");

    await expect(page.getByText("Failed to load train routes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("retry button retriggers route fetch", async ({ page }) => {
    // First request fails
    let requestCount = 0;
    await page.route("**/api/v2/graphql/graphql", async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server Error" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(graphqlRouteResponse),
        });
      }
    });

    await page.goto("/");

    // Should show error first
    await expect(page.getByText("Failed to load train routes")).toBeVisible();

    // Click retry
    await page.getByRole("button", { name: "Retry" }).click();

    // Error should disappear and initial prompt should show
    await expect(page.getByText("Failed to load train routes")).not.toBeVisible();
    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();
  });

  test("fetch button is disabled during route loading", async ({ page }) => {
    await mockGraphQLRoute(page, 3000);
    await page.goto("/");

    // While loading, fetch button should be disabled
    const fetchButton = page.getByRole("button", { name: "Fetch Data" });
    await expect(fetchButton).toBeDisabled();
  });

  test("shows initial prompt after successful route load", async ({ page }) => {
    await mockGraphQLRoute(page);
    await page.goto("/");

    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();
  });
});
