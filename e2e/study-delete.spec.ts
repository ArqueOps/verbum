import { test, expect } from "@playwright/test";

test.describe("Delete Study — /meus-estudos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/meus-estudos");
    await expect(page.locator("h1")).toContainText("Meus Estudos");
  });

  test("delete button opens modal with confirmation text", async ({
    page,
  }) => {
    const firstCard = page.locator("ul > li").first();

    // Hover to reveal the delete button (it's hidden by default via opacity-0)
    await firstCard.hover();

    // Click the trash button inside the card
    const deleteButton = firstCard.locator("button").filter({ has: page.locator("svg") }).first();
    await deleteButton.click();

    // Modal should appear with correct text
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Excluir estudo");
    await expect(dialog).toContainText("Tem certeza? Esta ação não pode ser desfeita.");

    // Should have Cancel and Delete buttons
    await expect(dialog.getByText("Cancelar")).toBeVisible();
    await expect(dialog.getByText("Excluir", { exact: true })).toBeVisible();

    // Close without deleting
    await dialog.getByText("Cancelar").click();
    await expect(dialog).not.toBeVisible();
  });

  test("confirming delete removes study and shows toast", async ({ page }) => {
    const items = page.locator("ul > li");
    const initialCount = await items.count();

    // Get the title of the last study (oldest, April study) to delete it
    const lastCard = items.last();
    const studyTitle = await lastCard.locator("h3").textContent();

    // Hover and click delete
    await lastCard.hover();
    const deleteButton = lastCard.locator("button").filter({ has: page.locator("svg") }).first();
    await deleteButton.click();

    // Confirm deletion in the modal
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByText("Excluir", { exact: true }).click();

    // Toast should appear
    await expect(page.getByText("Estudo excluído com sucesso")).toBeVisible({
      timeout: 5000,
    });

    // Card should be removed from the list (animation + removal)
    await expect(items).toHaveCount(initialCount - 1, { timeout: 5000 });

    // The deleted study title should no longer be visible
    if (studyTitle) {
      await expect(page.getByText(studyTitle)).not.toBeVisible();
    }
  });

  test("page refresh confirms deleted study is gone", async ({ page }) => {
    // Count studies before delete
    const items = page.locator("ul > li");
    const countBefore = await items.count();

    // Delete the last study
    const lastCard = items.last();
    await lastCard.hover();
    const deleteButton = lastCard.locator("button").filter({ has: page.locator("svg") }).first();
    await deleteButton.click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByText("Excluir", { exact: true }).click();

    // Wait for toast confirming deletion
    await expect(page.getByText("Estudo excluído com sucesso")).toBeVisible({
      timeout: 5000,
    });
    await expect(items).toHaveCount(countBefore - 1, { timeout: 5000 });

    // Refresh the page
    await page.reload();
    await expect(page.locator("h1")).toContainText("Meus Estudos");

    // After refresh, the study should still be gone (server-rendered count)
    await expect(items).toHaveCount(countBefore - 1);
  });
});
