import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Tests — SEO endpoints (sitemap.xml, robots.txt, canonical)
// ---------------------------------------------------------------------------

test.describe("SEO endpoints", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // -------------------------------------------------------------------------
  // /sitemap.xml
  // -------------------------------------------------------------------------

  test("/sitemap.xml returns HTTP 200 with valid XML content", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/);

    const body = await response.text();

    expect(body).toContain("<urlset");
    expect(body).toContain("</urlset>");
    expect(body).toContain("<url>");
    expect(body).toContain("<loc>");
  });

  test("/sitemap.xml contains static pages", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const body = await response.text();

    const expectedPaths = ["/", "/blog", "/pricing"];

    for (const path of expectedPaths) {
      expect(body).toContain(path);
    }
  });

  // -------------------------------------------------------------------------
  // /robots.txt
  // -------------------------------------------------------------------------

  test("/robots.txt returns HTTP 200 with correct directives", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/text\/plain/);

    const body = await response.text();

    expect(body).toMatch(/User-Agent/i);
    expect(body).toMatch(/Allow/i);
    expect(body).toMatch(/Disallow/i);
  });

  test("/robots.txt references sitemap.xml", async ({ request }) => {
    const response = await request.get("/robots.txt");
    const body = await response.text();

    expect(body).toMatch(/Sitemap:.*sitemap\.xml/i);
  });

  // -------------------------------------------------------------------------
  // Canonical link on public study page
  // -------------------------------------------------------------------------

  test("public study page has canonical link tag in rendered HTML", async ({
    request,
    page,
  }) => {
    const sitemapResponse = await request.get("/sitemap.xml");
    const sitemapBody = await sitemapResponse.text();

    const studyUrlMatch = sitemapBody.match(
      /<loc>[^<]*\/estudos\/([^<]+)<\/loc>/
    );

    if (!studyUrlMatch) {
      test.skip(true, "No published studies in sitemap to test canonical tag");
      return;
    }

    const studySlug = studyUrlMatch[1];
    await page.goto(`/estudos/${studySlug}`);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toBeAttached();

    const href = await canonical.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toMatch(/\/estudos\//);
    expect(href).toContain(studySlug);
  });
});
