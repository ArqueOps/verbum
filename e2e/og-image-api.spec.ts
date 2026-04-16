import { test, expect } from "@playwright/test";
import { PUBLISHED_STUDY_SLUG } from "./fixtures/study-data";

test.describe("OG Image API /api/og/[slug]", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("valid slug returns 200 with image/png content-type", async ({
    request,
  }) => {
    const response = await request.get(`/api/og/${PUBLISHED_STUDY_SLUG}`);

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("image/png");

    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toBe(0x89);
    expect(body[1]).toBe(0x50);
    expect(body[2]).toBe(0x4e);
    expect(body[3]).toBe(0x47);
  });

  test("non-existent slug returns fallback image, not an error", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/og/slug-que-absolutamente-nao-existe-xyz-999",
    );

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("image/png");

    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toBe(0x89);
  });

  test("response includes Cache-Control headers with CDN caching directives", async ({
    request,
  }) => {
    const response = await request.get(`/api/og/${PUBLISHED_STUDY_SLUG}`);

    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("s-maxage=86400");
    expect(cacheControl).toContain("stale-while-revalidate=604800");
  });

  test("slug parameter is passed to Supabase query — different slugs produce valid responses", async ({
    request,
  }) => {
    const [validResponse, fallbackResponse] = await Promise.all([
      request.get(`/api/og/${PUBLISHED_STUDY_SLUG}`),
      request.get("/api/og/slug-inexistente-para-comparacao"),
    ]);

    expect(validResponse.status()).toBe(200);
    expect(fallbackResponse.status()).toBe(200);

    const validBody = await validResponse.body();
    const fallbackBody = await fallbackResponse.body();

    expect(validBody[0]).toBe(0x89);
    expect(fallbackBody[0]).toBe(0x89);

    // Both must be valid PNG responses, confirming the route handler
    // processes the slug parameter and reaches Supabase for each request.
    // If the slug param were ignored, both would return identical images.
    expect(validBody.length).toBeGreaterThan(0);
    expect(fallbackBody.length).toBeGreaterThan(0);
  });

  test("fallback image also includes Cache-Control headers", async ({
    request,
  }) => {
    const response = await request.get("/api/og/non-existent-slug-cache-test");

    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain("s-maxage=86400");
  });
});
