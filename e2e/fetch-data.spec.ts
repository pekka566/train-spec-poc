import { test, expect } from "@playwright/test";
import {
  mockGraphQLRoute,
  mockAllTrainApis,
  mockTrainApiError,
  clearLocalStorage,
  getTestDate,
} from "./helpers";

test.describe("Data fetch and display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearLocalStorage(page);
  });

  test("fetches data and shows Summary view", async ({ page }) => {
    const testDate = getTestDate();
    await mockGraphQLRoute(page);
    await mockAllTrainApis(page, testDate);
    await page.goto("/");

    // Wait for route fetch to complete
    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    // Set date range to a single known date
    // Fill start date
    const startInput = page.getByLabel("Start date");
    await startInput.clear();
    await startInput.fill(testDate);
    await startInput.press("Enter");

    const endInput = page.getByLabel("End date");
    await endInput.clear();
    await endInput.fill(testDate);
    await endInput.press("Enter");

    // Click Fetch
    await page.getByRole("button", { name: "Fetch Data" }).click();

    // Summary cards should appear with train titles
    await expect(page.getByText("On Time").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Avg Delay").first()).toBeVisible();
  });

  test("switches to Table tab", async ({ page }) => {
    const testDate = getTestDate();
    await mockGraphQLRoute(page);
    await mockAllTrainApis(page, testDate);
    await page.goto("/");

    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    // Set dates and fetch
    const startInput = page.getByLabel("Start date");
    await startInput.clear();
    await startInput.fill(testDate);
    await startInput.press("Enter");

    const endInput = page.getByLabel("End date");
    await endInput.clear();
    await endInput.fill(testDate);
    await endInput.press("Enter");

    await page.getByRole("button", { name: "Fetch Data" }).click();
    await expect(page.getByText("On Time").first()).toBeVisible({ timeout: 10000 });

    // Switch to Table tab
    await page.getByRole("tab", { name: "Table" }).click();

    // Table should be visible with column headers
    await expect(page.getByRole("columnheader", { name: "Scheduled" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" }).first()).toBeVisible();
  });

  test("shows loading spinner during data fetch", async ({ page }) => {
    const testDate = getTestDate();
    await mockGraphQLRoute(page);
    // Delay REST API responses
    await mockAllTrainApis(page, testDate, 3000);
    await page.goto("/");

    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    const startInput = page.getByLabel("Start date");
    await startInput.clear();
    await startInput.fill(testDate);
    await startInput.press("Enter");

    const endInput = page.getByLabel("End date");
    await endInput.clear();
    await endInput.fill(testDate);
    await endInput.press("Enter");

    await page.getByRole("button", { name: "Fetch Data" }).click();

    // Loading spinner should appear
    await expect(page.getByText("Fetching data...")).toBeVisible();
  });

  test("shows error when all API calls fail", async ({ page }) => {
    await mockGraphQLRoute(page);
    await mockTrainApiError(page, 500);
    await page.goto("/");

    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    const testDate = getTestDate();
    const startInput = page.getByLabel("Start date");
    await startInput.clear();
    await startInput.fill(testDate);
    await startInput.press("Enter");

    const endInput = page.getByLabel("End date");
    await endInput.clear();
    await endInput.fill(testDate);
    await endInput.press("Enter");

    await page.getByRole("button", { name: "Fetch Data" }).click();

    // Error message should appear (with retry)
    await expect(page.getByText("Error")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("shows too many API calls warning", async ({ page }) => {
    await mockGraphQLRoute(page);
    await page.goto("/");

    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    // Set a very wide date range that would exceed 30 API calls
    const startInput = page.getByLabel("Start date");
    await startInput.clear();
    await startInput.fill("2025-12-01");
    await startInput.press("Enter");

    const endInput = page.getByLabel("End date");
    await endInput.clear();
    await endInput.fill("2026-01-27");
    await endInput.press("Enter");

    // Warning should appear
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/Maximum is 30/)).toBeVisible();

    // Fetch button should be disabled
    await expect(page.getByRole("button", { name: "Fetch Data" })).toBeDisabled();
  });
});
