import { test, expect, type Page } from "@playwright/test";
import {
  ADMIN_STUDIES,
  ADMIN_USER,
  ADMIN_PROFILE,
  NON_ADMIN_PROFILE,
  type AdminStudyRow,
} from "./fixtures/admin-study-data";

// ---------------------------------------------------------------------------
// Helpers: suppress realtime errors and mock shared auth/profile endpoints
// ---------------------------------------------------------------------------

async function suppressRealtimeErrors(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener("error", (event) => {
      if (
        event.message?.includes("postgres_changes") &&
        event.message?.includes("subscribe")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
    window.addEventListener("unhandledrejection", (event) => {
      if (
        String(event.reason).includes("postgres_changes") ||
        String(event.reason).includes("subscribe")
      ) {
        event.preventDefault();
      }
    });
  });
}

async function mockAuthEndpoints(page: Page) {
  await page.route("**/auth/v1/user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ADMIN_USER),
    }),
  );

  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-admin-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-admin-refresh-token",
        user: ADMIN_USER,
      }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Helper: mock admin profile (role check)
// ---------------------------------------------------------------------------

function mockAdminProfile(page: Page) {
  return page.route("**/rest/v1/profiles*", (route) => {
    const headers = route.request().headers();

    if (headers["accept"]?.includes("vnd.pgrst.object")) {
      return route.fulfill({
        status: 200,
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify(ADMIN_PROFILE),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([ADMIN_PROFILE]),
    });
  });
}

function mockNonAdminProfile(page: Page) {
  return page.route("**/rest/v1/profiles*", (route) => {
    const headers = route.request().headers();
    if (headers["accept"]?.includes("vnd.pgrst.object")) {
      return route.fulfill({
        status: 200,
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify(NON_ADMIN_PROFILE),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([NON_ADMIN_PROFILE]),
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: mock studies list with search & pagination
// ---------------------------------------------------------------------------

function filterStudies(
  studies: AdminStudyRow[],
  search?: string,
): AdminStudyRow[] {
  if (!search?.trim()) return studies;
  const lower = search.toLowerCase();
  return studies.filter((s) => s.title.toLowerCase().includes(lower));
}

function extractSearchTerm(url: string): string | undefined {
  // Supabase PostgREST: title=ilike.%25searchterm%25
  // Decoded: title=ilike.%searchterm%
  const match = url.match(/title=ilike\.(%25|%)([^&%]+)(%25|%)/i);
  if (match?.[2]) return decodeURIComponent(match[2]);

  // Fallback: try raw pattern title=ilike.*searchterm*
  const fallback = url.match(/title=ilike\.\*([^*&]+)\*/i);
  return fallback?.[1] ? decodeURIComponent(fallback[1]) : undefined;
}

async function mockStudiesApi(page: Page) {
  await page.route("**/rest/v1/studies*", (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === "PATCH") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (method === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    const searchTerm = extractSearchTerm(url);
    const filtered = filterStudies([...ADMIN_STUDIES], searchTerm);

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-range": `0-${Math.max(filtered.length - 1, 0)}/${filtered.length}`,
      },
      body: JSON.stringify(filtered),
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: set up all admin mocks
// ---------------------------------------------------------------------------

async function setupAdminMocks(page: Page) {
  await suppressRealtimeErrors(page);
  await mockAuthEndpoints(page);
  await mockAdminProfile(page);
  await mockStudiesApi(page);
}

async function waitForTable(page: Page) {
  await expect(page.getByTestId("admin-loading")).not.toBeVisible({
    timeout: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Tests — Admin Study Moderation: Unpublish Flow
// ---------------------------------------------------------------------------

test.describe("Admin study moderation — Unpublish flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
  });

  test("unpublish button opens modal, empty reason shows error, valid reason succeeds", async ({
    page,
  }) => {
    await page.goto("/admin/estudos");
    await waitForTable(page);

    await expect(page.getByTestId("admin-studies-table")).toBeVisible();
    const rows = page.getByTestId("admin-study-row");
    await expect(rows).toHaveCount(ADMIN_STUDIES.length);

    const publishedRow = rows.first();
    const unpublishButton = publishedRow.getByTestId("unpublish-button");
    await expect(unpublishButton).toBeVisible();
    await unpublishButton.click();

    const reasonTextarea = page.getByTestId("unpublish-reason");
    await expect(reasonTextarea).toBeVisible();

    const confirmButton = page.getByTestId("confirm-unpublish");
    await confirmButton.click();

    await expect(page.getByTestId("unpublish-reason-error")).toBeVisible();
    await expect(page.getByTestId("unpublish-reason-error")).toContainText(
      "Informe o motivo",
    );

    await reasonTextarea.fill("Conteúdo inadequado para o público");
    await confirmButton.click();

    await expect(publishedRow.getByTestId("status-unpublished")).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      publishedRow.getByTestId("unpublish-button"),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Tests — Admin Study Moderation: Delete Flow
// ---------------------------------------------------------------------------

test.describe("Admin study moderation — Delete flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
  });

  test("cancel delete keeps study in list, confirm delete removes it", async ({
    page,
  }) => {
    await page.goto("/admin/estudos");
    await waitForTable(page);

    const rows = page.getByTestId("admin-study-row");
    await expect(rows).toHaveCount(ADMIN_STUDIES.length);

    const targetRow = rows.first();
    const studyTitle = await targetRow.locator("td").first().textContent();

    const deleteButton = targetRow.getByTestId("delete-button");
    await deleteButton.click();

    const cancelButton = page.getByTestId("cancel-delete");
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(rows).toHaveCount(ADMIN_STUDIES.length);

    await deleteButton.click();
    const confirmButton = page.getByTestId("confirm-delete");
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(rows).toHaveCount(ADMIN_STUDIES.length - 1, {
      timeout: 5_000,
    });
    const remainingTitles = await rows
      .locator("td:first-child")
      .allTextContents();
    expect(remainingTitles).not.toContain(studyTitle);
  });
});

// ---------------------------------------------------------------------------
// Tests — Admin Study Moderation: Search
// ---------------------------------------------------------------------------

test.describe("Admin study moderation — Search", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
  });

  test("search filters studies by title", async ({ page }) => {
    await page.goto("/admin/estudos");
    await waitForTable(page);

    await expect(page.getByTestId("admin-study-row")).toHaveCount(
      ADMIN_STUDIES.length,
    );

    const searchInput = page.getByTestId("admin-search-input");
    await searchInput.fill("Sermão");

    // Wait for debounce + refetch
    await expect(page.getByTestId("admin-study-row")).toHaveCount(1, {
      timeout: 10_000,
    });
    await expect(page.getByTestId("admin-study-row").first()).toContainText(
      "O Sermão do Monte",
    );
  });

  test("search with no matches shows empty state", async ({ page }) => {
    await page.goto("/admin/estudos");
    await waitForTable(page);

    const searchInput = page.getByTestId("admin-search-input");
    await searchInput.fill("xyznonexistent");

    await expect(page.getByTestId("admin-empty")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("admin-empty")).toContainText(
      "Nenhum estudo encontrado",
    );
  });
});

// ---------------------------------------------------------------------------
// Tests — Non-admin access blocked
// ---------------------------------------------------------------------------

test.describe("Admin study moderation — Access control", () => {
  test("non-admin user sees 403 forbidden page", async ({ page }) => {
    await suppressRealtimeErrors(page);
    await mockAuthEndpoints(page);
    await mockNonAdminProfile(page);

    await page.goto("/admin/estudos");

    await expect(page.getByTestId("admin-forbidden")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("admin-forbidden")).toContainText("403");
    await expect(page.getByTestId("admin-forbidden")).toContainText(
      "Acesso restrito a administradores",
    );
  });

  test("unauthenticated user is redirected to login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto("/admin/estudos");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await context.close();
  });
});

// ---------------------------------------------------------------------------
// Tests — Pagination
// ---------------------------------------------------------------------------

test.describe("Admin study moderation — Pagination", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
  });

  test("page size selector is visible and functional", async ({ page }) => {
    await page.goto("/admin/estudos");
    await waitForTable(page);

    const pagination = page.getByTestId("admin-pagination");
    await expect(pagination).toBeVisible();

    const pageSizeSelect = page.getByTestId("admin-page-size");
    await expect(pageSizeSelect).toBeVisible();
    await expect(pageSizeSelect).toHaveValue("10");
  });
});
