import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Pricing page is PUBLIC — no auth required
// ---------------------------------------------------------------------------
test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Tests — Desktop (chromium project)
// ---------------------------------------------------------------------------

test.describe("Pricing page user flow", () => {
  test("page loads with heading and subtitle", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.locator("h1")).toContainText("Planos e Preços");
    await expect(page.locator("p")).toContainText(
      "Escolha o plano ideal para sua jornada de estudos bíblicos",
    );
  });

  test("displays all 4 plan cards with correct prices", async ({ page }) => {
    await page.goto("/pricing");

    const planSection = page.locator('section[aria-label="Planos disponíveis"]');
    await expect(planSection).toBeVisible();

    const cards = planSection.locator("article");
    await expect(cards).toHaveCount(4);

    // Verify each plan name and price
    const expectedPlans = [
      { name: "Gratuito", price: "R$0" },
      { name: "Estudante", price: "R$9,90" },
      { name: "Teólogo", price: "R$39,90" },
      { name: "Comunidade", price: "R$19,90" },
    ];

    for (const plan of expectedPlans) {
      const card = planSection.locator("article", { hasText: plan.name });
      await expect(card).toBeVisible();
      await expect(card).toContainText(plan.price);
    }
  });

  test("clicking 'Começar Grátis' navigates to /register", async ({ page }) => {
    await page.goto("/pricing");

    const ctaLink = page.locator('a:has-text("Começar Grátis")');
    await expect(ctaLink).toBeVisible();
    await ctaLink.click();

    await page.waitForURL("**/register**");
    expect(page.url()).toContain("/register");
  });

  test("recommended plan badge is visible on highlighted card", async ({ page }) => {
    await page.goto("/pricing");

    const planSection = page.locator('section[aria-label="Planos disponíveis"]');

    // Exactly one card should be highlighted
    const highlightedCards = planSection.locator("article[data-highlighted]");
    await expect(highlightedCards).toHaveCount(1);

    // The highlighted card is the Comunidade plan
    const highlightedCard = highlightedCards.first();
    await expect(highlightedCard).toContainText("Comunidade");

    // Badge text "Recomendado" is visible on the highlighted card
    const badge = highlightedCard.locator("span", { hasText: "Recomendado" });
    await expect(badge).toBeVisible();
  });

  test("feature comparison section is visible with content", async ({ page }) => {
    await page.goto("/pricing");

    const comparisonSection = page.locator(
      'section[aria-label="Comparação de funcionalidades"]',
    );
    await expect(comparisonSection).toBeVisible();

    // Section heading
    await expect(comparisonSection.locator("h2")).toContainText("Compare os planos");

    // Table with plan column headers
    const table = comparisonSection.locator("table");
    await expect(table).toBeVisible();

    const headers = table.locator("thead th");
    await expect(headers).toHaveCount(5); // Funcionalidade + 4 plans

    // Verify plan names appear as column headers
    for (const planName of ["Gratuito", "Estudante", "Teólogo", "Comunidade"]) {
      await expect(table.locator("thead th", { hasText: planName })).toBeVisible();
    }

    // Table has data rows
    const dataRows = table.locator("tbody tr");
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Tests — Responsive layout (uses setViewportSize per consensus correction)
// ---------------------------------------------------------------------------

test.describe("Pricing page responsive layout", () => {
  test("plan cards stack vertically on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/pricing");

    const planSection = page.locator('section[aria-label="Planos disponíveis"]');
    const cards = planSection.locator("article");
    await expect(cards).toHaveCount(4);

    // On mobile, cards should be stacked: each card's top edge is below
    // the previous card's bottom edge
    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();

    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    // Second card is below first (stacked vertically)
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 1);

    // Cards should be approximately full width of the section
    const sectionBox = await planSection.boundingBox();
    expect(sectionBox).not.toBeNull();
    expect(firstBox!.width).toBeGreaterThan(sectionBox!.width * 0.85);
  });

  test("plan cards form a grid on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pricing");

    const planSection = page.locator('section[aria-label="Planos disponíveis"]');
    const cards = planSection.locator("article");

    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();

    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    // On desktop, cards are side by side: same y position (within tolerance)
    expect(Math.abs(secondBox!.y - firstBox!.y)).toBeLessThan(5);
  });
});
