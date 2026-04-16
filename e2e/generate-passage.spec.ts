import { test, expect, type Page } from "@playwright/test";
import { VERSIONS, BOOKS } from "./fixtures/bible-data";

// ---------------------------------------------------------------------------
// Helper: intercept Supabase PostgREST calls and return fixture data
// ---------------------------------------------------------------------------

async function mockSupabaseApi(page: Page) {
  // Mock bible_versions query
  await page.route("**/rest/v1/bible_versions*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VERSIONS) }),
  );

  // Mock bible_books listing (all books)
  await page.route("**/rest/v1/bible_books?*order=position*", (route) => {
    // The useBibleBooks hook fetches all books ordered by position
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BOOKS) });
  });

  // Mock bible_books single-row fetch for chapter count (useBibleChapters)
  await page.route("**/rest/v1/bible_books?*id=eq.*", (route) => {
    const url = route.request().url();
    const match = url.match(/id=eq\.([^&]+)/);
    const bookId = match?.[1];
    const book = BOOKS.find((b) => b.id === bookId);

    if (book) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Content-Range": "0-0/1" },
        body: JSON.stringify(book),
      });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(null) });
  });
}

// ---------------------------------------------------------------------------
// Helper: select an item from a FilterableDropdown by clicking the input,
// typing a search term, and clicking the matching option
// ---------------------------------------------------------------------------

async function selectDropdownItem(page: Page, label: string, searchTerm: string) {
  // Find the dropdown by its label text
  const container = page.locator(`label:has-text("${label}")`).locator("..");
  const input = container.locator('input[role="combobox"]');

  await input.click();
  await input.fill(searchTerm);

  // Wait for the listbox to appear and click the matching option
  const option = container.locator('[role="option"]', { hasText: searchTerm });
  await option.first().click();
}

// ---------------------------------------------------------------------------
// Tests — Desktop (chromium project)
// ---------------------------------------------------------------------------

test.describe("Passage selection flow on /generate", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseApi(page);
  });

  test("page loads with correct heading", async ({ page }) => {
    await page.goto("/generate");

    await expect(page.locator("h1")).toContainText("Gerar Estudo");
    await expect(page.locator("p")).toContainText("Selecione a passagem bíblica");
  });

  test("full flow: version → book → chapter → verses → preview", async ({ page }) => {
    await page.goto("/generate");

    // 1. Select version
    await selectDropdownItem(page, "Versão", "Almeida Corrigida Fiel");

    // 2. Select book
    await selectDropdownItem(page, "Livro", "Gênesis");

    // 3. Chapter dropdown should now be visible — select chapter 1
    await selectDropdownItem(page, "Capítulo", "1");

    // 4. Enter verse range
    const verseStartInput = page.locator('input[placeholder="Início"]');
    const verseEndInput = page.locator('input[placeholder="Fim"]');
    await verseStartInput.fill("1");
    await verseEndInput.fill("3");

    // 5. Preview should show the formatted passage
    const preview = page.locator("text=Passagem selecionada").locator("..");
    await expect(preview).toContainText("Gênesis 1:1-3 (ACF)");
  });

  test("books are grouped by Antigo/Novo Testamento", async ({ page }) => {
    await page.goto("/generate");

    // Open book dropdown
    const bookContainer = page.locator('label:has-text("Livro")').locator("..");
    const bookInput = bookContainer.locator('input[role="combobox"]');
    await bookInput.click();

    // Verify testament group headers are visible
    const listbox = bookContainer.locator('[role="listbox"]');
    await expect(listbox.locator("text=Antigo Testamento")).toBeVisible();
    await expect(listbox.locator("text=Novo Testamento")).toBeVisible();

    // Verify OT books appear under Antigo Testamento
    await expect(listbox.locator('[role="option"]', { hasText: "Gênesis" })).toBeVisible();
    await expect(listbox.locator('[role="option"]', { hasText: "Êxodo" })).toBeVisible();

    // Verify NT books appear under Novo Testamento
    await expect(listbox.locator('[role="option"]', { hasText: "Mateus" })).toBeVisible();
    await expect(listbox.locator('[role="option"]', { hasText: "Romanos" })).toBeVisible();
  });

  test("verse range validation: fim < início shows error", async ({ page }) => {
    await page.goto("/generate");

    // Select version, book, chapter to enable verse inputs
    await selectDropdownItem(page, "Versão", "Almeida Corrigida Fiel");
    await selectDropdownItem(page, "Livro", "Gênesis");
    await selectDropdownItem(page, "Capítulo", "1");

    // Enter invalid range: end < start
    const verseStartInput = page.locator('input[placeholder="Início"]');
    const verseEndInput = page.locator('input[placeholder="Fim"]');
    await verseStartInput.fill("10");
    await verseEndInput.fill("5");

    // Error message should be visible
    const errorMessage = page.locator('p[role="alert"]');
    await expect(errorMessage).toContainText("O versículo final deve ser maior ou igual ao inicial");

    // Inputs should have error styling (aria-invalid)
    await expect(verseStartInput).toHaveAttribute("aria-invalid", "true");
    await expect(verseEndInput).toHaveAttribute("aria-invalid", "true");

    // Preview is still visible but should NOT include the invalid verse range
    // (the PassagePreview component shows book+chapter but omits verse range when end < start)
    const preview = page.locator("text=Passagem selecionada").locator("..");
    await expect(preview).toBeVisible();
    // With invalid range, the preview shows just "Gênesis 1:10 (ACF)" — not "10-5"
    await expect(preview).not.toContainText("10-5");
  });

  test("chapter dropdown only appears after book selection", async ({ page }) => {
    await page.goto("/generate");

    // Chapter dropdown should not exist before book selection
    await expect(page.locator('label:has-text("Capítulo")')).not.toBeVisible();

    // Select a book
    await selectDropdownItem(page, "Versão", "Almeida Corrigida Fiel");
    await selectDropdownItem(page, "Livro", "Gênesis");

    // Chapter dropdown should now be visible
    await expect(page.locator('label:has-text("Capítulo")')).toBeVisible();
  });

  test("preview hidden when selection is incomplete", async ({ page }) => {
    await page.goto("/generate");

    // Only select version — preview should not appear
    await selectDropdownItem(page, "Versão", "Almeida Corrigida Fiel");
    await expect(page.locator("text=Passagem selecionada")).not.toBeVisible();

    // Select book — still incomplete (no chapter)
    await selectDropdownItem(page, "Livro", "Gênesis");
    await expect(page.locator("text=Passagem selecionada")).not.toBeVisible();

    // Select chapter — now preview should appear
    await selectDropdownItem(page, "Capítulo", "1");
    await expect(page.locator("text=Passagem selecionada")).toBeVisible();
    await expect(page.locator("text=Passagem selecionada").locator("..")).toContainText("Gênesis 1 (ACF)");
  });
});

// ---------------------------------------------------------------------------
// Tests — Mobile viewport (mobile project)
// ---------------------------------------------------------------------------

test.describe("Responsive layout on mobile viewport", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseApi(page);
  });

  test("form fields stack vertically on mobile", async ({ page }, testInfo) => {
    // This test only runs in the 'mobile' project (iPhone 14 viewport)
    // Skip if running in desktop project
    if (testInfo.project.name !== "mobile") {
      test.skip();
    }

    await page.goto("/generate");

    // Verify the grid container uses single-column layout on mobile
    // On mobile (< 640px), grid-cols-1 makes fields stack
    const grid = page.locator(".grid");
    const box = await grid.boundingBox();
    expect(box).not.toBeNull();

    // Verify fields are stacked: each child should have roughly the same
    // width as the parent (full-width) on mobile viewport
    const versionContainer = page.locator('label:has-text("Versão")').locator("..");
    const bookContainer = page.locator('label:has-text("Livro")').locator("..");

    const versionBox = await versionContainer.boundingBox();
    const bookBox = await bookContainer.boundingBox();

    expect(versionBox).not.toBeNull();
    expect(bookBox).not.toBeNull();

    // On stacked layout, book should be BELOW version (higher y position)
    expect(bookBox!.y).toBeGreaterThan(versionBox!.y + versionBox!.height - 1);

    // Both should be approximately full width of the grid
    expect(versionBox!.width).toBeGreaterThan(box!.width * 0.9);
    expect(bookBox!.width).toBeGreaterThan(box!.width * 0.9);
  });
});
