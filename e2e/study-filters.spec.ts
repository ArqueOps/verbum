import { test, expect } from "@playwright/test";

test.describe("Study Filters — /meus-estudos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/meus-estudos");
    // Wait for the page heading to confirm it loaded
    await expect(page.locator("h1")).toContainText("Meus Estudos");
  });

  test("shows all seeded studies by default", async ({ page }) => {
    // 4 studies were seeded
    const items = page.locator("ul > li");
    await expect(items).toHaveCount(4);
  });

  test("favorites toggle filters study list correctly", async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();

    // URL should contain favoritos=true
    await expect(page).toHaveURL(/favoritos=true/);

    // Only 2 studies are bookmarked (Genesis 1 and Exodus 3)
    const items = page.locator("ul > li");
    await expect(items).toHaveCount(2);

    // Uncheck to restore all
    await checkbox.uncheck();
    await expect(items).toHaveCount(4);
  });

  test("book dropdown filters study list correctly", async ({ page }) => {
    const select = page.locator("#livro-filter");

    // Select Gênesis
    await select.selectOption({ label: "Gênesis" });
    await expect(page).toHaveURL(/livro=/);

    const items = page.locator("ul > li");
    await expect(items).toHaveCount(2);

    // Both should have "Gn" in their verse reference
    for (const item of await items.all()) {
      await expect(item).toContainText("Gn");
    }

    // Switch to Êxodo
    await select.selectOption({ label: "Êxodo" });
    await expect(items).toHaveCount(2);
    for (const item of await items.all()) {
      await expect(item).toContainText("Ex");
    }

    // Reset to "Todos os livros"
    await select.selectOption({ label: "Todos os livros" });
    await expect(items).toHaveCount(4);
  });

  test("date range picker filters study list correctly", async ({ page }) => {
    const dateFrom = page.locator("#date-from");
    const dateTo = page.locator("#date-to");

    // Set date range to Feb-Mar 2026 (should include Genesis 2 and Exodus 1)
    await dateFrom.fill("2026-02-01");
    await expect(page).toHaveURL(/de=2026-02-01/);

    await dateTo.fill("2026-03-31");
    await expect(page).toHaveURL(/ate=2026-03-31/);

    const items = page.locator("ul > li");
    await expect(items).toHaveCount(2);

    // Clear dateFrom — should show studies up to March
    await dateFrom.fill("");
    await expect(page).not.toHaveURL(/de=/);
    // Studies from Jan, Feb, Mar = 3
    await expect(items).toHaveCount(3);

    // Clear dateTo too — back to all
    await dateTo.fill("");
    await expect(page).not.toHaveURL(/ate=/);
    await expect(items).toHaveCount(4);
  });

  test("combined filters apply AND logic", async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]');
    const select = page.locator("#livro-filter");

    // Favorites + Gênesis — only the bookmarked Genesis study (1 study)
    await checkbox.check();
    await select.selectOption({ label: "Gênesis" });

    await expect(page).toHaveURL(/favoritos=true/);
    await expect(page).toHaveURL(/livro=/);

    const items = page.locator("ul > li");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("Gênesis 1");
  });

  test("browser back/forward preserves filter state in URL", async ({
    page,
  }) => {
    const select = page.locator("#livro-filter");
    const items = page.locator("ul > li");

    // Step 1: no filters (all 4 studies)
    await expect(items).toHaveCount(4);

    // Step 2: select Gênesis
    await select.selectOption({ label: "Gênesis" });
    await expect(items).toHaveCount(2);
    await expect(page).toHaveURL(/livro=/);

    // Step 3: go back — should restore unfiltered state
    await page.goBack();
    await expect(page).not.toHaveURL(/livro=/);
    await expect(items).toHaveCount(4);

    // Step 4: go forward — should restore Gênesis filter
    await page.goForward();
    await expect(page).toHaveURL(/livro=/);
    await expect(items).toHaveCount(2);
  });
});
