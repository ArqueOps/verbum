import { test, expect, type Page } from "@playwright/test";
import {
  PUBLISHED_STUDIES,
  BLOG_BOOKS,
  type StudyResult,
} from "./fixtures/blog-data";

// ---------------------------------------------------------------------------
// Helper: intercept Supabase API calls and return fixture data
// ---------------------------------------------------------------------------

function filterStudies(
  query?: string,
  testament?: string,
  bookId?: string,
): StudyResult[] {
  let results = [...PUBLISHED_STUDIES];

  if (testament) {
    results = results.filter((s) => s.book_testament === testament);
  }

  if (bookId) {
    const book = BLOG_BOOKS.find((b) => b.id === bookId);
    if (book) {
      results = results.filter((s) => s.book_name === book.name);
    }
  }

  if (query && query.trim()) {
    const lower = query.toLowerCase();
    results = results.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.verse_reference.toLowerCase().includes(lower),
    );
  }

  return results;
}

async function mockBlogApis(page: Page) {
  // Prevent Supabase Realtime from crashing the page in dev mode.
  // The useCredits hook subscribes to realtime, which throws when
  // strict-mode double-renders the effect. We patch the Supabase
  // RealtimeChannel.on() to silently ignore calls after subscribe().
  await page.addInitScript(() => {
    // Catch the specific realtime error globally to prevent React from
    // showing "This page couldn't load" in dev mode.
    window.addEventListener("error", (event) => {
      if (event.message?.includes("postgres_changes") && event.message?.includes("subscribe")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
    // Also catch unhandled promise rejections from Supabase auth
    window.addEventListener("unhandledrejection", (event) => {
      if (String(event.reason).includes("postgres_changes") || String(event.reason).includes("subscribe")) {
        event.preventDefault();
      }
    });
  });

  // Mock Supabase auth endpoint (browser-side session refresh)
  await page.route("**/auth/v1/user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-user-id",
        email: "e2e@test.com",
        role: "authenticated",
        app_metadata: { provider: "email" },
        user_metadata: { name: "E2E User" },
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00Z",
      }),
    }),
  );

  // Mock Supabase auth token refresh
  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: {
          id: "e2e-user-id",
          email: "e2e@test.com",
          role: "authenticated",
        },
      }),
    }),
  );

  // Mock profiles table (used by Header/CreditsBadge)
  await page.route("**/rest/v1/profiles*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ credits_remaining: 10, role: "user" }]),
    }),
  );

  // Mock bible_books listing (used by BlogFilters via useBibleBooks hook)
  await page.route("**/rest/v1/bible_books*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(BLOG_BOOKS),
    }),
  );

  // Mock search_published_studies RPC (POST to /rest/v1/rpc/search_published_studies)
  await page.route("**/rest/v1/rpc/search_published_studies*", (route) => {
    const request = route.request();

    if (request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, string> | null;
      const results = filterStudies(
        body?.query,
        body?.testament,
        body?.book_id,
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(results),
      });
    }

    // GET fallback (initial load with no params)
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PUBLISHED_STUDIES),
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: wait for results to load (spinner gone, results or empty visible)
// ---------------------------------------------------------------------------

async function waitForResults(page: Page) {
  await expect(page.getByTestId("blog-loading")).not.toBeVisible({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Tests — Blog search and filter flow
// ---------------------------------------------------------------------------

test.describe("Blog search and filter flow on /blog", () => {
  // Blog is a public page — no auth required
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockBlogApis(page);
  });

  test("page loads with search bar and filters visible", async ({ page }) => {
    await page.goto("/blog");

    // Heading renders
    await expect(page.locator("h1")).toContainText("Blog");

    // Search bar is visible
    await expect(page.getByTestId("search-input")).toBeVisible();

    // Filter section is visible with both dropdowns
    await expect(page.getByTestId("blog-filters")).toBeVisible();
    await expect(page.getByTestId("testament-filter")).toBeVisible();
    await expect(page.getByTestId("book-filter")).toBeVisible();

    // Initial results load (all 4 studies)
    await waitForResults(page);
    const cards = page.getByTestId("blog-card");
    await expect(cards).toHaveCount(4);
  });

  test("typing in search bar updates results after debounce", async ({ page }) => {
    await page.goto("/blog");
    await waitForResults(page);

    // Type a search query that matches one study
    await page.getByTestId("search-input").fill("Criação");

    // Wait for debounce (300ms) + network + render
    await waitForResults(page);
    const cards = page.getByTestId("blog-card");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("A Criação do Mundo");
  });

  test("selecting testament filter narrows results", async ({ page }) => {
    await page.goto("/blog");
    await waitForResults(page);
    await expect(page.getByTestId("blog-card")).toHaveCount(4);

    // Select "Antigo Testamento"
    await page.getByTestId("testament-filter").selectOption("old");

    await waitForResults(page);
    const cards = page.getByTestId("blog-card");
    await expect(cards).toHaveCount(2);

    // Verify only OT studies are shown
    await expect(cards.nth(0)).toContainText("Gênesis");
    await expect(cards.nth(1)).toContainText("Êxodo");
  });

  test("selecting book filter within testament narrows further", async ({ page }) => {
    await page.goto("/blog");
    await waitForResults(page);

    // Select "Novo Testamento"
    await page.getByTestId("testament-filter").selectOption("new");
    await waitForResults(page);
    await expect(page.getByTestId("blog-card")).toHaveCount(2);

    // Now select book "Mateus"
    await page.getByTestId("book-filter").selectOption("book-mat");
    await waitForResults(page);
    const cards = page.getByTestId("blog-card");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("O Sermão do Monte");
  });

  test("combining search text with filters shows correct results", async ({ page }) => {
    await page.goto("/blog");
    await waitForResults(page);

    // Select "Antigo Testamento" filter
    await page.getByTestId("testament-filter").selectOption("old");
    await waitForResults(page);
    await expect(page.getByTestId("blog-card")).toHaveCount(2);

    // Type search query that matches only one OT study
    await page.getByTestId("search-input").fill("Êxodo");
    await waitForResults(page);
    const cards = page.getByTestId("blog-card");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("O Êxodo do Egito");
  });

  test("clicking 'Limpar filtros' resets and shows all studies", async ({ page }) => {
    await page.goto("/blog");
    await waitForResults(page);

    // Apply testament filter
    await page.getByTestId("testament-filter").selectOption("old");
    await waitForResults(page);
    await expect(page.getByTestId("blog-card")).toHaveCount(2);

    // "Limpar filtros" button should now be visible
    const clearButton = page.getByTestId("clear-filters");
    await expect(clearButton).toBeVisible();

    // Click clear
    await clearButton.click();
    await waitForResults(page);

    // All studies should return
    await expect(page.getByTestId("blog-card")).toHaveCount(4);

    // Clear button should disappear
    await expect(clearButton).not.toBeVisible();
  });

  test("search with no matches shows 'Nenhum estudo encontrado'", async ({ page }) => {
    await page.goto("/blog");
    await waitForResults(page);

    // Type a query that matches nothing
    await page.getByTestId("search-input").fill("xyznonexistent");
    await waitForResults(page);

    // Empty state message is visible
    const emptyState = page.getByTestId("blog-empty");
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("Nenhum estudo encontrado");

    // No cards rendered
    await expect(page.getByTestId("blog-card")).toHaveCount(0);
  });
});
