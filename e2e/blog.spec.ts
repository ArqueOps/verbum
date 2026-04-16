import { test, expect, type Page } from "@playwright/test";
import {
  PUBLISHED_STUDIES_SMALL,
  PUBLISHED_STUDIES_PAGINATED,
  PAGE_1,
  PAGE_2,
  type PublishedStudy,
} from "./fixtures/blog-data";

// ---------------------------------------------------------------------------
// Helper: intercept Supabase PostgREST calls for published studies
// ---------------------------------------------------------------------------

async function mockStudiesApi(page: Page, studies: PublishedStudy[]) {
  await page.route("**/rest/v1/studies*", (route) => {
    const url = route.request().url();

    // Only intercept queries that filter by is_published
    if (!url.includes("is_published")) {
      return route.fallback();
    }

    // Parse pagination from URL: offset and limit
    const offsetMatch = url.match(/offset=(\d+)/);
    const limitMatch = url.match(/limit=(\d+)/);
    const offset = offsetMatch ? Number(offsetMatch[1]) : 0;
    const limit = limitMatch ? Number(limitMatch[1]) : 12;

    const slice = studies.slice(offset, offset + limit);
    const total = studies.length;

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Content-Range": `${offset}-${offset + slice.length - 1}/${total}`,
      },
      body: JSON.stringify(slice),
    });
  });
}

async function mockEmptyStudiesApi(page: Page) {
  await page.route("**/rest/v1/studies*", (route) => {
    const url = route.request().url();

    if (!url.includes("is_published")) {
      return route.fallback();
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Content-Range": "*/0" },
      body: JSON.stringify([]),
    });
  });
}

// ---------------------------------------------------------------------------
// Blog page loads without authentication
// ---------------------------------------------------------------------------

test.describe("Blog page — public access", () => {
  // Override storage state so tests run WITHOUT authentication
  test.use({ storageState: { cookies: [], origins: [] } });

  test("page loads without login redirect", async ({ page }) => {
    await mockStudiesApi(page, PUBLISHED_STUDIES_SMALL);
    await page.goto("/blog");

    // Should NOT redirect to /login
    await expect(page).toHaveURL(/\/blog/);

    // Page heading should be visible
    await expect(page.locator("h1")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Blog cards render with expected content
// ---------------------------------------------------------------------------

test.describe("Blog cards display", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockStudiesApi(page, PUBLISHED_STUDIES_SMALL);
  });

  test("blog cards render for published studies", async ({ page }) => {
    await page.goto("/blog");

    const cards = page.locator('[data-testid="study-card"]');
    await expect(cards).toHaveCount(PUBLISHED_STUDIES_SMALL.length);
  });

  test("each card shows title and passage reference", async ({ page }) => {
    await page.goto("/blog");

    const firstCard = page.locator('[data-testid="study-card"]').first();
    await expect(firstCard.locator('[data-testid="study-card-title"]')).toHaveText(
      PUBLISHED_STUDIES_SMALL[0]!.title,
    );
    await expect(firstCard.locator('[data-testid="study-card-passage"]')).toBeVisible();
  });

  test("clicking a card navigates to /study/[slug]", async ({ page }) => {
    await page.goto("/blog");

    const firstCard = page.locator('[data-testid="study-card"]').first();
    await firstCard.click();

    const expectedSlug = PUBLISHED_STUDIES_SMALL[0]!.slug;
    await expect(page).toHaveURL(new RegExp(`/study/${expectedSlug}`));
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

test.describe("Blog pagination", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("page 1 shows 12 cards when more than 12 studies exist", async ({ page }) => {
    await mockStudiesApi(page, PUBLISHED_STUDIES_PAGINATED);
    await page.goto("/blog");

    const cards = page.locator('[data-testid="study-card"]');
    await expect(cards).toHaveCount(PAGE_1.length);
  });

  test("next page button navigates to page 2 and URL updates", async ({ page }) => {
    await mockStudiesApi(page, PUBLISHED_STUDIES_PAGINATED);
    await page.goto("/blog");

    // Click the next page / page 2 button
    const nextButton = page.locator('[data-testid="pagination-next"]');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // URL should update to include ?page=2
    await expect(page).toHaveURL(/[?&]page=2/);

    // Page 2 should show remaining cards
    const cards = page.locator('[data-testid="study-card"]');
    await expect(cards).toHaveCount(PAGE_2.length);
  });

  test("pagination is not shown when studies fit in one page", async ({ page }) => {
    await mockStudiesApi(page, PUBLISHED_STUDIES_SMALL);
    await page.goto("/blog");

    const pagination = page.locator('[data-testid="pagination-next"]');
    await expect(pagination).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

test.describe("Blog empty state", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows empty state message when no published studies exist", async ({ page }) => {
    await mockEmptyStudiesApi(page);
    await page.goto("/blog");

    const emptyState = page.locator('[data-testid="blog-empty-state"]');
    await expect(emptyState).toBeVisible();

    // Should NOT show any study cards
    const cards = page.locator('[data-testid="study-card"]');
    await expect(cards).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Responsive layout — mobile, tablet, desktop
// ---------------------------------------------------------------------------

test.describe("Blog responsive layout", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("cards stack in single column on mobile", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile") {
      test.skip();
    }

    await mockStudiesApi(page, PUBLISHED_STUDIES_SMALL);
    await page.goto("/blog");

    const cards = page.locator('[data-testid="study-card"]');
    await expect(cards).toHaveCount(PUBLISHED_STUDIES_SMALL.length);

    // On mobile (375px), cards should stack vertically
    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    // Second card should be below the first (stacked, not side by side)
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 1);

    // Both cards should be approximately full width of the viewport
    expect(firstBox!.width).toBeGreaterThan(300);
    expect(secondBox!.width).toBeGreaterThan(300);
  });

  test("cards display in multi-column grid on desktop", async ({ page }, testInfo) => {
    if (testInfo.project.name === "mobile") {
      test.skip();
    }

    await mockStudiesApi(page, PUBLISHED_STUDIES_SMALL);
    await page.goto("/blog");

    const cards = page.locator('[data-testid="study-card"]');
    await expect(cards).toHaveCount(PUBLISHED_STUDIES_SMALL.length);

    // On desktop (1280px), cards should be in a multi-column grid
    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    // On a multi-column grid, the second card is on the same row (similar y)
    // or the first card takes less than half the viewport width
    const sameRow = Math.abs(secondBox!.y - firstBox!.y) < 10;
    const narrowCards = firstBox!.width < 600;
    expect(sameRow || narrowCards).toBe(true);
  });
});
