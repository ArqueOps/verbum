import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FAKE_ADMIN_USER = {
  id: "e2e-admin-id-00000000-0000-0000-0000-000000000001",
  email: "admin@verbum.test",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2025-01-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: {},
};

const FAKE_FREE_USER = {
  id: "e2e-free-id-00000000-0000-0000-0000-000000000002",
  email: "free@verbum.test",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2025-01-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mockAuthUser(page: Page, user: typeof FAKE_ADMIN_USER) {
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    }),
  );
}

async function mockProfile(
  page: Page,
  userId: string,
  role: "free" | "premium" | "admin",
) {
  await page.route("**/rest/v1/profiles*", (route) => {
    const url = route.request().url();
    if (url.includes(`id=eq.${userId}`) || url.includes("select=")) {
      return route.fulfill({
        status: 200,
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify({
          id: userId,
          display_name: role === "admin" ? "Admin User" : "Free User",
          avatar_url: null,
          role,
        }),
      });
    }
    return route.fallback();
  });
}

async function mockSupabaseRealtime(page: Page) {
  await page.route("**/realtime/v1/**", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
}

// ---------------------------------------------------------------------------
// 1. Unauthenticated user — middleware redirects to /login
// ---------------------------------------------------------------------------

test.describe("Admin page — unauthenticated user", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("visiting /admin redirects to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Authenticated non-admin user — redirected away from /admin
// ---------------------------------------------------------------------------

test.describe("Admin page — authenticated non-admin user", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthUser(page, FAKE_FREE_USER);
    await mockProfile(page, FAKE_FREE_USER.id, "free");
    await mockSupabaseRealtime(page);
  });

  test("non-admin user visiting /admin is redirected to home", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 10_000 });
    await expect(page).toHaveURL(/^\/$|^\/(?!admin)/, { timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Authenticated admin user — sees dashboard
// ---------------------------------------------------------------------------

test.describe("Admin page — authenticated admin user", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthUser(page, FAKE_ADMIN_USER);
    await mockProfile(page, FAKE_ADMIN_USER.id, "admin");
    await mockSupabaseRealtime(page);
  });

  test("admin user sees 'Painel Administrativo' heading", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });

    const heading = page.locator("h1");
    await expect(heading).toContainText("Painel Administrativo", {
      timeout: 10_000,
    });
  });

  test("admin user sees at least one metric card", async ({ page }) => {
    await page.route("**/rest/v1/rpc/*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(0),
      }),
    );

    await page.route("**/rest/v1/studies*", (route) => {
      if (route.request().url().includes("select=count")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ count: 42 }]),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/rest/v1/profiles*", (route) => {
      const url = route.request().url();
      if (url.includes("select=count")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ count: 10 }]),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify({
          id: FAKE_ADMIN_USER.id,
          display_name: "Admin User",
          avatar_url: null,
          role: "admin",
        }),
      });
    });

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });

    const metricCards = page.locator('[data-testid="metric-card"]');
    await expect(metricCards.first()).toBeVisible({ timeout: 10_000 });

    const cardCount = await metricCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });
});
