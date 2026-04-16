import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const FAKE_PROFILE = {
  display_name: "E2E Tester",
  avatar_url: "",
};

const FAKE_SUBSCRIPTION = {
  id: "sub-00000000-0000-0000-0000-000000000001",
  user_id: FAKE_USER.id,
  caramelou_subscription_id: "caramelou-sub-123",
  plan_id: "monthly",
  status: "active",
  current_period_start: "2026-04-01T00:00:00Z",
  current_period_end: "2026-05-01T00:00:00Z",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
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

async function mockProfile(page: Page) {
  await page.route("**/rest/v1/profiles*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/vnd.pgrst.object+json",
      body: JSON.stringify(FAKE_PROFILE),
    }),
  );
}

async function mockSubscription(
  page: Page,
  subscription: typeof FAKE_SUBSCRIPTION | null,
) {
  await page.route("**/rest/v1/subscriptions*", (route) => {
    if (subscription) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([subscription]),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
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

async function mockCancelApi(page: Page) {
  const requests: Record<string, unknown>[] = [];

  await page.route("**/api/subscription/cancel", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }

    const body = JSON.parse(route.request().postData() ?? "{}");
    requests.push(body);

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  return requests;
}

async function mockSubscriptionEvents(
  page: Page,
  events: Record<string, unknown>[],
) {
  await page.route("**/rest/v1/subscription_events*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(events),
    }),
  );
}

async function gotoPerfilAndWaitForHydration(page: Page) {
  const authResponse = page.waitForResponse("**/auth/v1/user", {
    timeout: 15_000,
  });

  await page.goto("/perfil");

  await authResponse;

  await page.waitForTimeout(200);
}

async function gotoCancelarAndWaitForHydration(page: Page) {
  const authResponse = page.waitForResponse("**/auth/v1/user", {
    timeout: 15_000,
  });

  await page.goto("/perfil/cancelar");

  await authResponse;

  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// 1. Non-subscriber — cannot see subscription section
// ---------------------------------------------------------------------------

test.describe("Subscription cancellation — non-subscriber", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockProfile(page);
    await mockSubscription(page, null);
    await mockUserCredits(page, false);
    await mockSubscriptionEvents(page, []);
  });

  test("subscription section is not visible on /perfil for non-subscriber", async ({
    page,
  }) => {
    await gotoPerfilAndWaitForHydration(page);

    await expect(page.getByTestId("subscription-section")).not.toBeVisible();
  });

  test("/perfil/cancelar redirects non-subscriber back to /perfil", async ({
    page,
  }) => {
    await gotoCancelarAndWaitForHydration(page);

    await expect(page).toHaveURL(/\/perfil$/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Unauthenticated user — redirected to login
// ---------------------------------------------------------------------------

test.describe("Subscription cancellation — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/perfil redirects to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("/perfil/cancelar redirects to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/perfil/cancelar");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Subscriber — sees subscription section on /perfil
// ---------------------------------------------------------------------------

test.describe("Subscription cancellation — subscriber profile view", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockProfile(page);
    await mockSubscription(page, FAKE_SUBSCRIPTION);
    await mockUserCredits(page, true);
    await mockSubscriptionEvents(page, []);
  });

  test("subscription section is visible with plan details", async ({
    page,
  }) => {
    await gotoPerfilAndWaitForHydration(page);

    const section = page.getByTestId("subscription-section");
    await expect(section).toBeVisible({ timeout: 10_000 });

    await expect(section.getByTestId("subscription-plan")).toBeVisible();
    await expect(section.getByTestId("subscription-status")).toBeVisible();
  });

  test("'Cancelar minha assinatura' link is visible and navigates to /perfil/cancelar", async ({
    page,
  }) => {
    await gotoPerfilAndWaitForHydration(page);

    const cancelLink = page.getByTestId("cancel-subscription-link");
    await expect(cancelLink).toBeVisible();
    await expect(cancelLink).toContainText("Cancelar minha assinatura");

    await cancelLink.click();

    await expect(page).toHaveURL(/\/perfil\/cancelar/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 4. Happy path — complete cancellation through all 4 steps
// ---------------------------------------------------------------------------

test.describe("Subscription cancellation — full cancellation flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockProfile(page);
    await mockSubscription(page, FAKE_SUBSCRIPTION);
    await mockUserCredits(page, true);
    await mockSubscriptionEvents(page, []);
  });

  test("navigates through all 4 steps and completes cancellation", async ({
    page,
  }) => {
    const cancelRequests = await mockCancelApi(page);

    await gotoCancelarAndWaitForHydration(page);

    // Step 1: View plan data
    const step1 = page.getByTestId("cancellation-step-plan");
    await expect(step1).toBeVisible({ timeout: 10_000 });
    await expect(step1.getByTestId("plan-name")).toBeVisible();

    const nextStep1 = page.getByTestId("cancellation-next-step");
    await nextStep1.click();

    // Step 2: Select cancellation reason
    const step2 = page.getByTestId("cancellation-step-reason");
    await expect(step2).toBeVisible({ timeout: 5_000 });

    const firstReason = step2.getByTestId("cancellation-reason-0");
    await firstReason.click();

    const nextStep2 = page.getByTestId("cancellation-next-step");
    await nextStep2.click();

    // Step 3: Optional feedback
    const step3 = page.getByTestId("cancellation-step-feedback");
    await expect(step3).toBeVisible({ timeout: 5_000 });

    const feedbackInput = step3.getByTestId("cancellation-feedback-input");
    await feedbackInput.fill("Estou cancelando para testar o fluxo E2E.");

    const nextStep3 = page.getByTestId("cancellation-next-step");
    await nextStep3.click();

    // Step 4: Confirmation
    const step4 = page.getByTestId("cancellation-step-confirm");
    await expect(step4).toBeVisible({ timeout: 5_000 });

    const confirmButton = page.getByTestId("confirm-cancellation-button");
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toContainText("Quero cancelar");

    await Promise.all([
      page.waitForResponse("**/api/subscription/cancel"),
      confirmButton.click(),
    ]);

    expect(cancelRequests).toHaveLength(1);
    expect(cancelRequests[0]).toHaveProperty("reason");

    // Verify redirect to /perfil with success feedback
    await expect(page).toHaveURL(/\/perfil/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 5. "Mudei de ideia" — returns to /perfil without cancellation
// ---------------------------------------------------------------------------

test.describe("Subscription cancellation — 'Mudei de ideia' path", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockProfile(page);
    await mockSubscription(page, FAKE_SUBSCRIPTION);
    await mockUserCredits(page, true);
    await mockSubscriptionEvents(page, []);
  });

  test("clicking 'Mudei de ideia' returns to /perfil without calling cancel API", async ({
    page,
  }) => {
    const cancelRequests = await mockCancelApi(page);

    await gotoCancelarAndWaitForHydration(page);

    // Wait for the first step to be visible
    await expect(
      page.getByTestId("cancellation-step-plan"),
    ).toBeVisible({ timeout: 10_000 });

    const changeOfMindButton = page.getByTestId("cancel-flow-back-button");
    await expect(changeOfMindButton).toBeVisible();
    await expect(changeOfMindButton).toContainText("Mudei de ideia");

    await changeOfMindButton.click();

    // Should return to profile without making any cancellation request
    await expect(page).toHaveURL(/\/perfil$/, { timeout: 10_000 });

    expect(cancelRequests).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Transaction history — shows cancellation event after cancellation
// ---------------------------------------------------------------------------

test.describe("Subscription cancellation — transaction history", () => {
  test("transaction history table shows cancellation event after cancellation", async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await mockProfile(page);

    const canceledSubscription = {
      ...FAKE_SUBSCRIPTION,
      status: "canceled" as const,
    };
    await mockSubscription(page, canceledSubscription);
    await mockUserCredits(page, false);
    await mockSubscriptionEvents(page, [
      {
        id: "evt-00000000-0000-0000-0000-000000000001",
        event_type: "subscription_canceled",
        created_at: "2026-04-16T10:00:00Z",
        metadata: { reason: "Não uso o suficiente" },
      },
    ]);

    await gotoPerfilAndWaitForHydration(page);

    const historyTable = page.getByTestId("transaction-history-table");
    await expect(historyTable).toBeVisible({ timeout: 10_000 });

    const cancellationRow = historyTable.getByTestId(
      "transaction-row-subscription_canceled",
    );
    await expect(cancellationRow).toBeVisible();
  });
});
