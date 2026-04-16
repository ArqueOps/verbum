import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

const E2E_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-test@verbum.test";
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "e2e-test-password-123";

setup("authenticate via login page", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#email").fill(E2E_EMAIL);
  await page.locator("#password").fill(E2E_PASSWORD);

  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from /login — successful auth redirects to /
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
