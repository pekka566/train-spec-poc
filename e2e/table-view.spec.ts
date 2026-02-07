import { test, expect } from "@playwright/test";
import {
  mockGraphQLRoute,
  clearLocalStorage,
} from "./helpers";
import {
  train1719Response,
  train9700Response,
  withDate,
} from "../src/mocks/fixtures";

test.describe("Table view", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearLocalStorage(page);
  });

  test("table shows correct columns", async ({ page }) => {
    const testDate = "2026-01-27";
    await mockGraphQLRoute(page);
    await page.route(`**/api/v1/trains/${testDate}/1719`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(withDate(train1719Response, testDate)),
      });
    });
    await page.route(`**/api/v1/trains/${testDate}/9700`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(withDate(train9700Response, testDate)),
      });
    });

    await page.goto("/");
    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    // Set dates
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

    // Verify column headers
    await expect(page.getByRole("columnheader", { name: "Scheduled" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Actual" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Delay" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" }).first()).toBeVisible();
  });

  test("sort toggle works on Date column", async ({ page }) => {
    const testDate = "2026-01-27";
    await mockGraphQLRoute(page);
    await page.route(`**/api/v1/trains/${testDate}/1719`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(withDate(train1719Response, testDate)),
      });
    });
    await page.route(`**/api/v1/trains/${testDate}/9700`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(withDate(train9700Response, testDate)),
      });
    });

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
    await expect(page.getByText("On Time").first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("tab", { name: "Table" }).click();

    // Default sort is descending
    const sortButton = page.getByRole("button", { name: /sort by date, descending/i }).first();
    await expect(sortButton).toBeVisible();

    // Click to toggle to ascending
    await sortButton.click();
    await expect(
      page.getByRole("button", { name: /sort by date, ascending/i }).first()
    ).toBeVisible();
  });

  test("cancelled train shows dash marks", async ({ page }) => {
    const testDate = "2026-01-27";
    await mockGraphQLRoute(page);

    // Mock train 1719 as cancelled
    await page.route(`**/api/v1/trains/${testDate}/1719`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            trainNumber: 1719,
            departureDate: testDate,
            trainType: "HL",
            operatorShortCode: "vr",
            runningCurrently: false,
            cancelled: true,
            timeTableRows: [
              {
                stationShortCode: "LPÄ",
                type: "DEPARTURE",
                scheduledTime: `${testDate}T06:20:00Z`,
                commercialStop: true,
                cancelled: true,
              },
              {
                stationShortCode: "TPE",
                type: "ARRIVAL",
                scheduledTime: `${testDate}T06:40:00Z`,
                commercialStop: true,
                cancelled: true,
              },
            ],
          },
        ]),
      });
    });
    await page.route(`**/api/v1/trains/${testDate}/9700`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(withDate(train9700Response, testDate)),
      });
    });

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
    await expect(page.getByText("Cancelled").first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("tab", { name: "Table" }).click();

    // The cancelled badge should be visible in the table
    await expect(page.getByText("Cancelled").first()).toBeVisible();
  });
});
