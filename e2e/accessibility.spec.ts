import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  mockGraphQLRoute,
  mockGraphQLError,
  mockAllTrainApis,
  clearLocalStorage,
  getTestDate,
} from "./helpers";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearLocalStorage(page);
  });

  test("loading state passes axe checks", async ({ page }) => {
    await mockGraphQLRoute(page, 3000);
    await page.goto("/");

    // Wait for the loading spinner to appear
    await expect(page.getByText("Loading train routes...")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("train selection view passes axe checks", async ({ page }) => {
    await mockGraphQLRoute(page);
    await page.goto("/");

    // Wait for route fetch to complete - initial prompt visible
    await expect(
      page.getByText(
        'Select a date range and click "Fetch Data" to load train data.'
      )
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("summary view with data passes axe checks", async ({ page }) => {
    const testDate = getTestDate();
    await mockGraphQLRoute(page);
    await mockAllTrainApis(page, testDate);
    await page.goto("/");

    // Wait for route fetch
    await expect(
      page.getByText(
        'Select a date range and click "Fetch Data" to load train data.'
      )
    ).toBeVisible();

    // Set dates and fetch data
    const startInput = page.getByLabel("Start date");
    await startInput.clear();
    await startInput.fill(testDate);
    await startInput.press("Enter");

    const endInput = page.getByLabel("End date");
    await endInput.clear();
    await endInput.fill(testDate);
    await endInput.press("Enter");

    await page.getByRole("button", { name: "Fetch Data" }).click();

    // Wait for data to load
    await expect(page.getByText("On Time").first()).toBeVisible({
      timeout: 10000,
    });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("table view passes axe checks", async ({ page }) => {
    const testDate = getTestDate();
    await mockGraphQLRoute(page);
    await mockAllTrainApis(page, testDate);
    await page.goto("/");

    await expect(
      page.getByText(
        'Select a date range and click "Fetch Data" to load train data.'
      )
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
    await expect(page.getByText("On Time").first()).toBeVisible({
      timeout: 10000,
    });

    // Switch to Table tab
    await page.getByRole("tab", { name: "Table" }).click();
    await expect(
      page.getByRole("columnheader", { name: "Scheduled" }).first()
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("error state passes axe checks", async ({ page }) => {
    await mockGraphQLError(page, 500);
    await page.goto("/");

    // Wait for error alert
    await expect(
      page.getByText("Failed to load train routes")
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
