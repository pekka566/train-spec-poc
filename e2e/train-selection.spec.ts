import { test, expect } from "@playwright/test";
import { mockGraphQLRoute, clearLocalStorage } from "./helpers";

test.describe("Train selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearLocalStorage(page);
  });

  test("train selection dropdowns appear after route load", async ({ page }) => {
    await mockGraphQLRoute(page);
    await page.goto("/");

    // Wait for route fetch to complete (initial prompt visible)
    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    // Dropdowns should be enabled (not disabled)
    const outbound = page.getByRole("textbox", { name: "Outbound train" });
    const returnTrain = page.getByRole("textbox", { name: "Return train" });
    await expect(outbound).toBeEnabled();
    await expect(returnTrain).toBeEnabled();
  });

  test("default selections are 1719 and 9700", async ({ page }) => {
    await mockGraphQLRoute(page);
    await page.goto("/");

    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    // Check default outbound value contains 1719
    const outbound = page.getByRole("textbox", { name: "Outbound train" });
    await expect(outbound).toHaveValue(/1719/);

    // Check default return value contains 9700
    const returnTrain = page.getByRole("textbox", { name: "Return train" });
    await expect(returnTrain).toHaveValue(/9700/);
  });

  test("return train list filters based on outbound selection", async ({ page }) => {
    await mockGraphQLRoute(page);
    await page.goto("/");

    await expect(
      page.getByText('Select a date range and click "Fetch Data" to load train data.')
    ).toBeVisible();

    // Change outbound to the later train (1721 at 09:20)
    const outbound = page.getByRole("textbox", { name: "Outbound train" });
    await outbound.click();

    // Select the second outbound option (1721)
    await page.getByRole("option", { name: /1721/ }).click();

    // Return train should still show options (9700 and 9702 are both after 09:20)
    const returnTrain = page.getByRole("textbox", { name: "Return train" });
    await expect(returnTrain).toBeEnabled();
    // The return should still have a value (either 9700 or 9702)
    await expect(returnTrain).not.toHaveValue("");
  });
});
