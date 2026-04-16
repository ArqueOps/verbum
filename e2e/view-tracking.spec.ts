import { test, expect, type Page } from "@playwright/test";

const SLUG = "a-fe-que-move-montanhas-mt-17-20";
const COOKIE_NAME = `viewed_${SLUG}`;
const VIEW_API_URL = `/api/view/${SLUG}`;

function studyPageHtml(viewCount: number) {
  const label = viewCount === 1 ? "visualização" : "visualizações";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>A Fé que Move Montanhas — Verbum</title></head>
<body>
  <article data-testid="study-page">
    <header>
      <h1>A Fé que Move Montanhas — Mateus 17:20</h1>
      <div>
        <span>Mt 17:20</span>
        <span aria-hidden="true">&middot;</span>
        <span data-testid="view-count">${viewCount} ${label}</span>
      </div>
    </header>
    <section><h2>Contexto Histórico</h2><p>Conteúdo do estudo.</p></section>
  </article>
  <script>
    fetch("${VIEW_API_URL}", { method: "POST" }).catch(function() {});
  </script>
</body>
</html>`;
}

async function setupPageAndViewApi(
  page: Page,
  viewCount: number,
  viewCalls: Array<{ hasCookie: boolean }>,
) {
  await page.route(`**/estudos/${SLUG}`, (route, request) => {
    if (request.resourceType() === "document") {
      return route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: studyPageHtml(viewCount),
      });
    }
    return route.fallback();
  });

  await page.route(`**${VIEW_API_URL}`, (route) => {
    const cookies = route.request().headers()["cookie"] ?? "";
    viewCalls.push({ hasCookie: cookies.includes(COOKIE_NAME) });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ incremented: !cookies.includes(COOKIE_NAME) }),
    });
  });
}

function waitForViewPost(page: Page) {
  return page.waitForRequest(
    (req) =>
      req.method() === "POST" && req.url().includes(VIEW_API_URL),
  );
}

test.describe("View tracking on /estudos/[slug]", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("navigates to study page and finds view_count element", async ({
    page,
  }) => {
    const viewCalls: Array<{ hasCookie: boolean }> = [];
    await setupPageAndViewApi(page, 42, viewCalls);

    const postPromise = waitForViewPost(page);
    await page.goto(`/estudos/${SLUG}`);
    await postPromise;

    const viewCountEl = page.locator('[data-testid="view-count"]');
    await expect(viewCountEl).toBeVisible();
    await expect(viewCountEl).toContainText("42 visualizações");
  });

  test("view_count increments by 1 on first visit (POST fires without cookie)", async ({
    page,
  }) => {
    const viewCalls: Array<{ hasCookie: boolean }> = [];
    await setupPageAndViewApi(page, 15, viewCalls);

    const postPromise = waitForViewPost(page);
    await page.goto(`/estudos/${SLUG}`);
    await postPromise;

    expect(viewCalls).toHaveLength(1);
    expect(viewCalls[0].hasCookie).toBe(false);
  });

  test("reload within same browser context does not increment count (cookie present)", async ({
    page,
  }) => {
    const viewCalls: Array<{ hasCookie: boolean }> = [];
    await setupPageAndViewApi(page, 42, viewCalls);

    const firstPost = waitForViewPost(page);
    await page.goto(`/estudos/${SLUG}`);
    await firstPost;

    await page.context().addCookies([
      {
        name: COOKIE_NAME,
        value: "1",
        url: "http://localhost:3000",
        httpOnly: true,
      },
    ]);

    const reloadPost = waitForViewPost(page);
    await page.reload();
    await reloadPost;

    expect(viewCalls).toHaveLength(2);
    expect(viewCalls[0].hasCookie).toBe(false);
    expect(viewCalls[1].hasCookie).toBe(true);
  });

  test("after clearing cookies, next visit increments count (no cookie)", async ({
    page,
  }) => {
    const viewCalls: Array<{ hasCookie: boolean }> = [];
    await setupPageAndViewApi(page, 42, viewCalls);

    const firstPost = waitForViewPost(page);
    await page.goto(`/estudos/${SLUG}`);
    await firstPost;

    await page.context().addCookies([
      {
        name: COOKIE_NAME,
        value: "1",
        url: "http://localhost:3000",
        httpOnly: true,
      },
    ]);

    await page.context().clearCookies();

    const freshPost = waitForViewPost(page);
    await page.goto(`/estudos/${SLUG}`);
    await freshPost;

    const lastCall = viewCalls[viewCalls.length - 1];
    expect(lastCall.hasCookie).toBe(false);
  });
});
