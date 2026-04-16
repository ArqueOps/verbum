import { test, expect, type Page } from "@playwright/test";
import {
  PUBLISHED_STUDY,
  PUBLISHED_STUDY_SLUG,
  STUDY_AUTHOR,
  EXPECTED_SECTIONS,
} from "./fixtures/study-data";

// ---------------------------------------------------------------------------
// Helper: intercept Supabase PostgREST calls for study + profile data
// ---------------------------------------------------------------------------

async function mockStudyApi(page: Page) {
  // Mock study fetch by slug — returns published study or empty array
  await page.route("**/rest/v1/studies?*slug=eq.*", (route) => {
    const url = route.request().url();
    const match = url.match(/slug=eq\.([^&]+)/);
    const slug = match?.[1];

    if (slug === PUBLISHED_STUDY_SLUG) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([PUBLISHED_STUDY]),
      });
    }

    // Non-existent slug → empty array
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock single-object study fetch (select...single)
  await page.route("**/rest/v1/studies?*slug=eq.*&*Accept*", (route) => {
    const url = route.request().url();
    const headers = route.request().headers();
    const match = url.match(/slug=eq\.([^&]+)/);
    const slug = match?.[1];

    // If the request uses Accept: application/vnd.pgrst.object+json (single row)
    if (headers["accept"]?.includes("vnd.pgrst.object")) {
      if (slug === PUBLISHED_STUDY_SLUG) {
        return route.fulfill({
          status: 200,
          contentType: "application/vnd.pgrst.object+json",
          body: JSON.stringify(PUBLISHED_STUDY),
        });
      }

      return route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify({
          message: "JSON object requested, multiple (or no) rows returned",
        }),
      });
    }

    return route.fallback();
  });

  // Mock profile fetch for study author
  await page.route("**/rest/v1/profiles?*id=eq.*", (route) => {
    const url = route.request().url();
    const match = url.match(/id=eq\.([^&]+)/);
    const profileId = match?.[1];

    if (profileId === STUDY_AUTHOR.id) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([STUDY_AUTHOR]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock study fetch with embedded profile (select=*,profiles(*))
  await page.route("**/rest/v1/studies*select=*profiles*", (route) => {
    const url = route.request().url();
    const match = url.match(/slug=eq\.([^&]+)/);
    const slug = match?.[1];

    if (slug === PUBLISHED_STUDY_SLUG) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { ...PUBLISHED_STUDY, profiles: STUDY_AUTHOR },
        ]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests — Public study page (unauthenticated access)
// ---------------------------------------------------------------------------

test.describe("Public study page /estudos/[slug]", () => {
  // These tests run WITHOUT auth — public access for published studies
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockStudyApi(page);
  });

  // -------------------------------------------------------------------------
  // AC1: Anonymous user sees study content with all 7 sections
  // -------------------------------------------------------------------------

  test("anonymous user sees title, passage, version, date, author and 7 sections", async ({ page }) => {
    await page.goto(`/estudos/${PUBLISHED_STUDY_SLUG}`);

    // Title is visible
    await expect(page.locator("h1")).toContainText(PUBLISHED_STUDY.title);

    // Verse reference (passage) is visible
    await expect(page.locator("body")).toContainText(PUBLISHED_STUDY.verse_reference);

    // Model/version used is visible
    await expect(page.locator("body")).toContainText(PUBLISHED_STUDY.model_used);

    // Published date is visible (formatted in pt-BR)
    const publishedDate = new Date(PUBLISHED_STUDY.published_at!);
    const formattedDay = publishedDate.getDate().toString();
    await expect(page.locator("body")).toContainText(formattedDay);

    // Author display name is visible
    await expect(page.locator("body")).toContainText(STUDY_AUTHOR.display_name!);

    // All 7 sections are visible (rendered as h2 from markdown ## headings)
    for (const section of EXPECTED_SECTIONS) {
      await expect(page.locator(`h2:has-text("${section}")`).first()).toBeVisible();
    }
  });

  // -------------------------------------------------------------------------
  // AC2: Non-existent slug returns 404
  // -------------------------------------------------------------------------

  test("anonymous user on non-existent slug sees 404 page", async ({ page }) => {
    const response = await page.goto("/estudos/slug-que-nao-existe-12345");

    // Page should render (Next.js not-found page)
    await expect(page.locator("body")).toBeVisible();

    // Should show 404 indicator — either via HTTP status or visible text
    const status = response?.status();
    const bodyText = await page.locator("body").textContent();
    const is404 =
      status === 404 ||
      bodyText?.includes("404") ||
      bodyText?.toLowerCase().includes("not found") ||
      bodyText?.includes("não encontrad");

    expect(is404).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // AC3: <title> contains study title
  // -------------------------------------------------------------------------

  test("page <title> contains the study title", async ({ page }) => {
    await page.goto(`/estudos/${PUBLISHED_STUDY_SLUG}`);

    const title = await page.title();
    expect(title).toContain("A Fé que Move Montanhas");
  });

  // -------------------------------------------------------------------------
  // AC3+AC4: Meta tags for SEO and social sharing
  // -------------------------------------------------------------------------

  test("meta description and Open Graph tags are present in <head>", async ({ page }) => {
    await page.goto(`/estudos/${PUBLISHED_STUDY_SLUG}`);

    // meta name="description" — must have content
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);

    // og:title
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);

    // og:image
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /.+/);

    // twitter:card = summary_large_image
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute("content", "summary_large_image");

    // link rel="canonical" with absolute URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /^https?:\/\/.+\/estudos\/.+/);
  });

  // -------------------------------------------------------------------------
  // AC5: JSON-LD structured data
  // -------------------------------------------------------------------------

  test("application/ld+json script with @type Article is present and parseable", async ({ page }) => {
    await page.goto(`/estudos/${PUBLISHED_STUDY_SLUG}`);

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toBeAttached();

    const jsonLdText = await jsonLdScript.textContent();
    expect(jsonLdText).toBeTruthy();

    // Must be valid JSON
    const jsonLd = JSON.parse(jsonLdText!);

    // Must be Article type
    expect(jsonLd["@type"]).toBe("Article");

    // Should contain basic Article fields
    expect(jsonLd).toHaveProperty("headline");
    expect(jsonLd).toHaveProperty("datePublished");
  });
});

// ---------------------------------------------------------------------------
// Tests — Mobile viewport (responsive)
// ---------------------------------------------------------------------------

test.describe("Public study page on mobile viewport", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockStudyApi(page);
  });

  test("study content is readable on mobile viewport", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile") {
      test.skip();
    }

    await page.goto(`/estudos/${PUBLISHED_STUDY_SLUG}`);

    // Title is visible on mobile
    await expect(page.locator("h1")).toContainText(PUBLISHED_STUDY.title);

    // Content does not overflow horizontally
    const body = await page.locator("body").boundingBox();
    expect(body).not.toBeNull();
    expect(body!.width).toBeLessThanOrEqual(375 + 1); // mobile viewport width + tolerance

    // All 7 sections are visible on mobile
    for (const section of EXPECTED_SECTIONS) {
      await expect(page.locator(`h2:has-text("${section}")`).first()).toBeVisible();
    }
  });
});
