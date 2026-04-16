import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARAMELOU_MONTHLY_URL =
  "https://caramelou.com.br/checkout/session-monthly-abc";
const CARAMELOU_ANNUAL_URL =
  "https://caramelou.com.br/checkout/session-annual-xyz";

const FAKE_USER = {
  id: "e2e-user-id-00000000-0000-0000-0000-000000000001",
  email: "e2e-test@verbum.test",
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

async function mockAuthenticatedUser(page: Page) {
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_USER),
    }),
  );
}

async function mockUserCredits(page: Page, hasActiveSubscription: boolean) {
  await page.route("**/rest/v1/user_credits*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/vnd.pgrst.object+json",
      body: JSON.stringify({
        has_active_subscription: hasActiveSubscription,
      }),
    }),
  );
}

async function mockCheckoutApi(page: Page, checkoutUrl: string) {
  const requests: { plan: string }[] = [];

  await page.route("**/api/checkout/create", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }

    const body = JSON.parse(route.request().postData() ?? "{}");
    requests.push(body);

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ checkoutUrl }),
    });
  });

  return requests;
}

/**
 * Navigate to /pricing and wait for the component to finish hydrating.
 * The PricingPlans component calls supabase.auth.getUser() in a useEffect.
 * We wait for the auth API response to ensure the component has set
 * isAuthenticated before any button interaction.
 */
async function gotoPricingAndWaitForHydration(page: Page) {
  // Start listening for the auth call BEFORE navigating
  const authResponse = page.waitForResponse("**/auth/v1/user", {
    timeout: 15_000,
  });

  await page.goto("/pricing");

  // Wait for the auth API call to complete — this means the useEffect ran
  await authResponse;

  // Small buffer for React state update after the auth response
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// 1. Unauthenticated user — middleware redirects to /login
// ---------------------------------------------------------------------------

test.describe("Pricing checkout — unauthenticated user", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("visiting /pricing redirects to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 2 & 3. Authenticated user without subscription — checkout flow
// ---------------------------------------------------------------------------

test.describe("Pricing checkout — authenticated without subscription", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockUserCredits(page, false);
  });

  test("monthly CTA calls /api/checkout/create and navigates to caramelou.com.br", async ({
    page,
  }) => {
    const apiRequests = await mockCheckoutApi(page, CARAMELOU_MONTHLY_URL);

    await gotoPricingAndWaitForHydration(page);

    const monthlyButton = page
      .locator("button", { hasText: "Assinar" })
      .first();
    await expect(monthlyButton).toBeVisible();
    await expect(monthlyButton).toBeEnabled();

    await Promise.all([
      page.waitForResponse("**/api/checkout/create"),
      monthlyButton.click(),
    ]);

    // Verify the correct plan was sent to the checkout API
    expect(apiRequests).toHaveLength(1);
    expect(apiRequests[0].plan).toBe("monthly");

    // The mock returned a caramelou.com.br URL. After window.location.href
    // is set, the page navigates away from /pricing.
    await expect(page).not.toHaveURL(/\/pricing/, { timeout: 5_000 });
  });

  test("annual CTA calls /api/checkout/create and navigates to caramelou.com.br", async ({
    page,
  }) => {
    const apiRequests = await mockCheckoutApi(page, CARAMELOU_ANNUAL_URL);

    await gotoPricingAndWaitForHydration(page);

    const annualButton = page.locator("button", {
      hasText: "Assinar Anual",
    });
    await expect(annualButton).toBeVisible();
    await expect(annualButton).toBeEnabled();

    await Promise.all([
      page.waitForResponse("**/api/checkout/create"),
      annualButton.click(),
    ]);

    expect(apiRequests).toHaveLength(1);
    expect(apiRequests[0].plan).toBe("annual");

    await expect(page).not.toHaveURL(/\/pricing/, { timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// 4. User with active subscription — disabled buttons
// ---------------------------------------------------------------------------

test.describe("Pricing checkout — user with active subscription", () => {
  test("monthly and annual buttons show 'Plano ativo' and are disabled", async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await mockUserCredits(page, true);

    await gotoPricingAndWaitForHydration(page);

    const planoAtivoButtons = page.locator("button", {
      hasText: "Plano ativo",
    });

    await expect(planoAtivoButtons).toHaveCount(2, { timeout: 10_000 });

    for (const button of await planoAtivoButtons.all()) {
      await expect(button).toBeDisabled();
      await expect(button).toContainText("Plano ativo");
    }
  });
});
