import { test, expect } from "@playwright/test";

const STUDY_SLUG = "estudo-de-genesis-1-1-5";

// ---------------------------------------------------------------------------
// Tests — CTA "Gere seu próprio estudo" (unauthenticated)
// ---------------------------------------------------------------------------

test.describe("Study page CTA — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("CTA is visible with correct text", async ({ page }) => {
    await page.goto(`/estudos/${STUDY_SLUG}`);

    const cta = page.locator('[data-testid="cta-generate-study"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText("Gere seu próprio estudo");
  });

  test("CTA links unauthenticated user to /login?redirect=/generate", async ({
    page,
  }) => {
    await page.goto(`/estudos/${STUDY_SLUG}`);

    const cta = page.locator('[data-testid="cta-generate-study"]');
    await expect(cta).toHaveAttribute("href", "/login?redirect=/generate");
  });
});

// ---------------------------------------------------------------------------
// Tests — CTA "Gere seu próprio estudo" (authenticated)
// ---------------------------------------------------------------------------

test.describe("Study page CTA — authenticated", () => {
  test("authenticated user CTA links to /generate", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name === "auth-setup") {
      test.skip();
    }

    await page.goto(`/estudos/${STUDY_SLUG}`);

    const cta = page.locator('[data-testid="cta-generate-study"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/generate");
  });
});

// ---------------------------------------------------------------------------
// Tests — Share buttons
// ---------------------------------------------------------------------------

test.describe("Study page share buttons", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("all 4 share buttons are present with correct attributes", async ({
    page,
  }) => {
    await page.goto(`/estudos/${STUDY_SLUG}`);

    const shareContainer = page.locator('[data-testid="share-buttons"]');
    await expect(shareContainer).toBeVisible();

    const whatsapp = page.locator('[data-testid="share-whatsapp"]');
    await expect(whatsapp).toBeVisible();
    await expect(whatsapp).toHaveAttribute(
      "aria-label",
      "Compartilhar no WhatsApp",
    );
    await expect(whatsapp).toHaveAttribute("href", /wa\.me/);
    await expect(whatsapp).toHaveAttribute("target", "_blank");

    const twitter = page.locator('[data-testid="share-twitter"]');
    await expect(twitter).toBeVisible();
    await expect(twitter).toHaveAttribute(
      "aria-label",
      "Compartilhar no X",
    );
    await expect(twitter).toHaveAttribute("href", /twitter\.com\/intent\/tweet/);

    const facebook = page.locator('[data-testid="share-facebook"]');
    await expect(facebook).toBeVisible();
    await expect(facebook).toHaveAttribute(
      "aria-label",
      "Compartilhar no Facebook",
    );
    await expect(facebook).toHaveAttribute("href", /facebook\.com\/sharer/);

    const linkedin = page.locator('[data-testid="share-linkedin"]');
    await expect(linkedin).toBeVisible();
    await expect(linkedin).toHaveAttribute(
      "aria-label",
      "Compartilhar no LinkedIn",
    );
    await expect(linkedin).toHaveAttribute("href", /linkedin\.com\/sharing/);
  });

  test("copy link button shows 'Link copiado!' feedback", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/estudos/${STUDY_SLUG}`);

    const copyBtn = page.locator('[data-testid="share-copy-link"]');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toContainText("Copiar Link");

    await copyBtn.click();

    const toastMessage = page.locator('[data-sonner-toast]').filter({
      hasText: "Link copiado!",
    });
    await expect(toastMessage).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Tests — Responsive (mobile viewport)
// ---------------------------------------------------------------------------

test.describe("Study page CTA & share on mobile", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("CTA and share buttons are visible on mobile viewport", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "mobile") {
      test.skip();
    }

    await page.goto(`/estudos/${STUDY_SLUG}`);

    const cta = page.locator('[data-testid="cta-generate-study"]');
    await expect(cta).toBeVisible();

    const shareContainer = page.locator('[data-testid="share-buttons"]');
    await expect(shareContainer).toBeVisible();

    await expect(page.locator('[data-testid="share-whatsapp"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-twitter"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-facebook"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-linkedin"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="share-copy-link"]'),
    ).toBeVisible();
  });
});
