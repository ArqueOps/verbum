import { test as setup, expect } from "@playwright/test";
import { seedTestData, TEST_USER_EMAIL, TEST_USER_PASSWORD } from "./helpers";

setup("seed data and authenticate", async ({ page }) => {
  // Seed test data via Supabase Admin API
  await seedTestData();

  // Authenticate via login page
  await page.goto("/login");
  await page.locator("#email").fill(TEST_USER_EMAIL);
  await page.locator("#password").fill(TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect after login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  // Save auth state for reuse across tests
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
